import db from '../db';
import clientRepository from '../repositories/clientRepository';
import creditRepository from '../repositories/creditRepository';
import orderRepository from '../repositories/orderRepository';
import paymentsRepository from '../repositories/paymentsRepository';
import simpleOrderRepository from '../repositories/simpleOrderRepository';
import cashSessionRepository from '../repositories/cashSessionRepository';
import userRepository from '../repositories/userRepository';
import type {
  AddCreditItemData,
  AddCreditPaymentData,
  CloseCreditData,
  CreateCreditData,
  CreditFilters,
  CreditItemInput,
  CreditPaymentMethod,
  CreditStatementParams,
  CreditSourceType,
  UpdateCreditItemData,
} from '../types/credit';

const VALID_PAYMENT_METHODS: CreditPaymentMethod[] = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];

interface NormalizedCreditItem {
  order_id: number | null;
  simple_order_id: number | null;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_by: number;
}

class CreditService {
  private parsePositiveId(value: number | string | null | undefined, field: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${field} inválido`);
    return parsed;
  }

  private validateDate(value: string, field: string): void {
    if (!value || isNaN(new Date(value).getTime())) throw new Error(`${field} inválida`);
  }

  private getPeriodBoundary(value: string, endOfDay: boolean): number {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!dateOnly) return new Date(value).getTime();

    const boundary = new Date(`${value}T00:00:00`);
    if (endOfDay) boundary.setHours(23, 59, 59, 999);
    return boundary.getTime();
  }

  private async ensureUser(userId: number): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('El usuario especificado no existe');
  }

  private async normalizeItem(data: CreditItemInput, excludeItemId?: number): Promise<NormalizedCreditItem> {
    const createdBy = this.parsePositiveId(data.created_by, 'ID de usuario');
    await this.ensureUser(createdBy);

    this.validateDate(data.date, 'Fecha del trabajo');
    const product = data.product?.trim();
    if (!product) throw new Error('El producto o concepto es requerido');

    const quantity = data.quantity === undefined ? 1 : parseFloat(String(data.quantity));
    const unitPrice = parseFloat(String(data.unit_price));
    const total = parseFloat(String(data.total));
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('La cantidad debe ser mayor a 0');
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('El precio unitario debe ser mayor a 0');
    if (!Number.isFinite(total) || total <= 0) throw new Error('El total debe ser mayor a 0');

    const calculatedTotal = Math.round(quantity * unitPrice * 100) / 100;
    if (Math.abs(calculatedTotal - total) > 0.01) {
      throw new Error(`El total (${total}) no coincide con cantidad × precio unitario (${calculatedTotal})`);
    }

    const orderId = data.order_id == null || data.order_id === ''
      ? null
      : this.parsePositiveId(data.order_id, 'ID de orden');
    const simpleOrderId = data.simple_order_id == null || data.simple_order_id === ''
      ? null
      : this.parsePositiveId(data.simple_order_id, 'ID de orden rápida');
    if (orderId && simpleOrderId) {
      throw new Error('Un cargo no puede relacionarse con una orden normal y una orden rápida al mismo tiempo');
    }

    if (orderId) {
      const order = await orderRepository.findById(orderId);
      if (!order) throw new Error('La orden especificada no existe o está inactiva');
      if (order.isCancelled()) throw new Error('No se puede trasladar a crédito una orden cancelada');
      const paid = await paymentsRepository.getTotalPaymentsByOrderId(orderId);
      const alreadyCredited = await creditRepository.getCreditedAmountByOrder(orderId, excludeItemId);
      if (!excludeItemId && alreadyCredited > 0.01) throw new Error('La orden ya está relacionada con un crédito activo');
      const available = Math.max(0, order.total - paid - alreadyCredited);
      if (total > available + 0.01) {
        throw new Error(`El cargo excede el saldo disponible de la orden. Disponible: ${available.toFixed(2)}`);
      }
    }

    if (simpleOrderId) {
      const simpleOrder = await simpleOrderRepository.getById(simpleOrderId);
      if (!simpleOrder || !simpleOrder.isActive()) throw new Error('La orden rápida especificada no existe o está inactiva');
      const alreadyCredited = await creditRepository.getCreditedAmountBySimpleOrder(simpleOrderId, excludeItemId);
      if (!excludeItemId && alreadyCredited > 0.01) throw new Error('La orden rápida ya está relacionada con un crédito activo');
      const available = Math.max(0, simpleOrder.total - simpleOrder.getTotalPaid() - alreadyCredited);
      if (total > available + 0.01) {
        throw new Error(`El cargo excede el saldo disponible de la orden rápida. Disponible: ${available.toFixed(2)}`);
      }
    }

    return {
      order_id: orderId,
      simple_order_id: simpleOrderId,
      date: data.date,
      product,
      quantity,
      unit_price: unitPrice,
      total,
      created_by: createdBy,
    };
  }

  async getAll(page = 1, limit = 20, filters: CreditFilters = {}) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      const status = filters.status && filters.status !== 'all' ? filters.status : undefined;
      if (status !== undefined && status !== 'open' && status !== 'closed') throw new Error('Estado de crédito inválido');
      const result = await creditRepository.findPaginated(page, limit, filters.searchTerm?.trim() || '', status);
      return { data: result.data.map((credit) => credit.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener créditos:', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const creditId = this.parsePositiveId(id, 'ID de crédito');
      const credit = await creditRepository.findById(creditId);
      if (!credit) throw new Error('Crédito no encontrado');
      return credit.toPlainObject();
    } catch (error) {
      console.error('Error al obtener crédito:', error);
      throw error;
    }
  }

  async getOpenByClientId(clientId: number) {
    try {
      const parsedClientId = this.parsePositiveId(clientId, 'ID de cliente');
      const credit = await creditRepository.findOpenByClientId(parsedClientId);
      return credit ? credit.toPlainObject() : null;
    } catch (error) {
      console.error('Error al obtener crédito del cliente:', error);
      throw error;
    }
  }

  async create(data: CreateCreditData) {
    try {
      const clientId = this.parsePositiveId(data.client_id, 'ID de cliente');
      const createdBy = this.parsePositiveId(data.created_by, 'ID de usuario');
      const client = await clientRepository.findById(clientId);
      if (!client) throw new Error('El cliente titular del crédito no existe o está inactivo');
      await this.ensureUser(createdBy);

      if (!data.initial_item) throw new Error('El crédito debe iniciar con al menos un cargo');
      if (this.parsePositiveId(data.initial_item.created_by, 'ID de usuario del cargo') !== createdBy) {
        throw new Error('El usuario del cargo inicial debe coincidir con el creador del crédito');
      }
      const transaction = db.transaction(async () => {
        const existing = await creditRepository.findOpenByClientId(clientId);
        if (existing) throw new Error(`El cliente ya tiene un crédito abierto (ID: ${existing.id})`);

        const normalizedItem = await this.normalizeItem(data.initial_item);

        const credit = await creditRepository.create({
          client_id: clientId,
          created_by: createdBy,
          notes: data.notes?.trim() || null,
        });
        if (!credit) throw new Error('No se pudo crear el crédito');

        const item = await creditRepository.addItem({ credit_id: credit.id, ...normalizedItem });
        if (!item) throw new Error('No se pudo crear el cargo inicial del crédito');

        const created = await creditRepository.findById(credit.id);
        if (!created) throw new Error('No se pudo recuperar el crédito creado');
        return created.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear crédito:', error);
      throw error;
    }
  }

  async addItem(data: AddCreditItemData) {
    try {
      const creditId = this.parsePositiveId(data.credit_id, 'ID de crédito');

      const transaction = db.transaction(async () => {
        if (!await creditRepository.lockById(creditId)) throw new Error('Crédito no encontrado');
        const credit = await creditRepository.findById(creditId);
        if (!credit) throw new Error('Crédito no encontrado');
        if (!credit.isOpen()) throw new Error('No se pueden agregar cargos a un crédito cerrado');

        const normalizedItem = await this.normalizeItem(data);

        const item = await creditRepository.addItem({ credit_id: creditId, ...normalizedItem });
        if (!item) throw new Error('No se pudo agregar el cargo');
        return item.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al agregar cargo al crédito:', error);
      throw error;
    }
  }

  async updateItem(id: number, data: UpdateCreditItemData) {
    try {
      const itemId = this.parsePositiveId(id, 'ID de cargo');
      const editedBy = this.parsePositiveId(data.edited_by, 'ID de usuario editor');
      await this.ensureUser(editedBy);
      const existing = await creditRepository.getItemById(itemId);
      if (!existing || !existing.active) throw new Error('Cargo de crédito no encontrado');

      const transaction = db.transaction(async () => {
        if (!await creditRepository.lockById(existing.credit_id)) throw new Error('Crédito no encontrado');
        const lockedItem = await creditRepository.getItemById(itemId);
        if (!lockedItem || !lockedItem.active) throw new Error('Cargo de crédito no encontrado');
        const credit = await creditRepository.findById(lockedItem.credit_id);
        if (!credit || !credit.isOpen()) throw new Error('Sólo se pueden editar cargos de créditos abiertos');

        const normalized = await this.normalizeItem({
          order_id: lockedItem.order_id,
          simple_order_id: lockedItem.simple_order_id,
          date: data.date ?? lockedItem.date,
          product: data.product ?? lockedItem.product,
          quantity: data.quantity ?? lockedItem.quantity,
          unit_price: data.unit_price ?? lockedItem.unit_price,
          total: data.total ?? lockedItem.total,
          created_by: editedBy,
        }, itemId);

        const charges = await creditRepository.getTotalCharges(lockedItem.credit_id);
        const payments = await creditRepository.getTotalPayments(lockedItem.credit_id);
        if (charges - lockedItem.total + normalized.total < payments - 0.01) {
          throw new Error('El nuevo total dejaría los pagos por encima de los cargos del crédito');
        }

        const updated = await creditRepository.updateItem(itemId, { ...normalized, edited_by: editedBy });
        if (!updated) throw new Error('No se pudo actualizar el cargo');
        return updated.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar cargo de crédito:', error);
      throw error;
    }
  }

  async removeItem(id: number) {
    try {
      const itemId = this.parsePositiveId(id, 'ID de cargo');
      const existing = await creditRepository.getItemById(itemId);
      if (!existing || !existing.active) throw new Error('Cargo de crédito no encontrado');

      const transaction = db.transaction(async () => {
        if (!await creditRepository.lockById(existing.credit_id)) throw new Error('Crédito no encontrado');
        const lockedItem = await creditRepository.getItemById(itemId);
        if (!lockedItem || !lockedItem.active) throw new Error('Cargo de crédito no encontrado');
        const credit = await creditRepository.findById(lockedItem.credit_id);
        if (!credit || !credit.isOpen()) throw new Error('Sólo se pueden eliminar cargos de créditos abiertos');
        const charges = await creditRepository.getTotalCharges(lockedItem.credit_id);
        const payments = await creditRepository.getTotalPayments(lockedItem.credit_id);
        if (charges - lockedItem.total < payments - 0.01) {
          throw new Error('No se puede eliminar el cargo porque el crédito ya tiene pagos que lo cubren');
        }
        const removed = await creditRepository.removeItem(itemId);
        if (!removed) throw new Error('No se pudo eliminar el cargo');
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar cargo de crédito:', error);
      throw error;
    }
  }

  async addPayment(data: AddCreditPaymentData) {
    try {
      const creditId = this.parsePositiveId(data.credit_id, 'ID de crédito');
      const createdBy = this.parsePositiveId(data.created_by, 'ID de usuario');
      await this.ensureUser(createdBy);
      const amount = parseFloat(String(data.amount));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('El abono debe ser mayor a 0');
      this.validateDate(data.date, 'Fecha del abono');
      if (!VALID_PAYMENT_METHODS.includes(data.payment_method)) throw new Error('Método de pago inválido');

      const transaction = db.transaction(async () => {
        if (!await creditRepository.lockById(creditId)) throw new Error('Crédito no encontrado');
        const credit = await creditRepository.findById(creditId);
        if (!credit) throw new Error('Crédito no encontrado');
        if (!credit.isOpen()) throw new Error('No se pueden registrar abonos en un crédito cerrado');

        const activeSession = await cashSessionRepository.getActive();
        if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar el abono.');

        const balance = credit.getBalance();
        if (amount > balance + 0.01) {
          throw new Error(`El abono excede el saldo del crédito. Saldo pendiente: ${balance.toFixed(2)}`);
        }

        const payment = await paymentsRepository.create({
          order_id: null,
          credit_id: creditId,
          created_by: createdBy,
          amount,
          date: data.date,
          descripcion: data.payment_method,
          info: data.info?.trim() || `Abono a crédito #${creditId}`,
          phone: credit.client_phone,
          client_name: credit.client_name,
        });
        if (!payment) throw new Error('No se pudo registrar el abono');
        return payment.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al registrar abono de crédito:', error);
      throw error;
    }
  }

  async updateNotes(id: number, notes: string | null) {
    try {
      const creditId = this.parsePositiveId(id, 'ID de crédito');
      const credit = await creditRepository.updateNotes(creditId, notes?.trim() || null);
      if (!credit) throw new Error('Crédito no encontrado');
      return credit.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar notas del crédito:', error);
      throw error;
    }
  }

  async close(id: number, data: CloseCreditData = {}) {
    try {
      const creditId = this.parsePositiveId(id, 'ID de crédito');
      const transaction = db.transaction(async () => {
        if (!await creditRepository.lockById(creditId)) throw new Error('Crédito no encontrado');
        const credit = await creditRepository.findById(creditId);
        if (!credit) throw new Error('Crédito no encontrado');
        if (!credit.isOpen()) throw new Error('El crédito ya está cerrado');
        if (Math.abs(credit.getBalance()) > 0.01) throw new Error('No se puede cerrar un crédito con saldo pendiente');
        const closed = await creditRepository.close(creditId, data.notes?.trim() || null);
        if (!closed) throw new Error('No se pudo cerrar el crédito');
        return closed.toPlainObject();
      });
      return await transaction();
    } catch (error) {
      console.error('Error al cerrar crédito:', error);
      throw error;
    }
  }

  async reopen(id: number) {
    try {
      const creditId = this.parsePositiveId(id, 'ID de crédito');
      const credit = await creditRepository.findById(creditId);
      if (!credit) throw new Error('Crédito no encontrado');
      if (credit.isOpen()) throw new Error('El crédito ya está abierto');
      const otherOpen = await creditRepository.findOpenByClientId(credit.client_id);
      if (otherOpen && otherOpen.id !== creditId) {
        throw new Error(`El cliente ya tiene otro crédito abierto (ID: ${otherOpen.id})`);
      }
      const reopened = await creditRepository.reopen(creditId);
      if (!reopened) throw new Error('No se pudo reabrir el crédito');
      return reopened.toPlainObject();
    } catch (error) {
      console.error('Error al reabrir crédito:', error);
      throw error;
    }
  }

  async getStatement(id: number, params: CreditStatementParams) {
    try {
      const creditId = this.parsePositiveId(id, 'ID de crédito');
      if (!params?.to) throw new Error('La fecha final del corte es requerida');
      this.validateDate(params.to, 'Fecha final del corte');
      if (params.from) this.validateDate(params.from, 'Fecha inicial del corte');

      const fromTime = params.from ? this.getPeriodBoundary(params.from, false) : null;
      const toTime = this.getPeriodBoundary(params.to, true);
      if (fromTime !== null && fromTime > toTime) throw new Error('La fecha inicial no puede ser posterior a la fecha final');

      const credit = await creditRepository.findById(creditId);
      if (!credit) throw new Error('Crédito no encontrado');
      const plain = credit.toPlainObject();

      const beforeFrom = (date: string) => fromTime !== null && new Date(date).getTime() < fromTime;
      const inPeriod = (date: string) => {
        const time = new Date(date).getTime();
        return time <= toTime && (fromTime === null || time >= fromTime);
      };

      const previousCharges = plain.items.filter((item) => beforeFrom(item.date)).reduce((sum, item) => sum + item.total, 0);
      const previousPayments = plain.payments.filter((payment) => beforeFrom(payment.date)).reduce((sum, payment) => sum + payment.amount, 0);
      const items = plain.items.filter((item) => inPeriod(item.date));
      const payments = plain.payments.filter((payment) => inPeriod(payment.date));
      const periodCharges = items.reduce((sum, item) => sum + item.total, 0);
      const periodPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const previousBalance = previousCharges - previousPayments;

      const movements = [
        ...items.map((item) => ({ type: 'charge' as const, date: item.date, id: item.id, description: item.product, charge: item.total, payment: 0, payment_method: null })),
        ...payments.map((payment) => ({ type: 'payment' as const, date: payment.date, id: payment.id, description: payment.info || 'Abono', charge: 0, payment: payment.amount, payment_method: payment.descripcion })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);

      return {
        credit: { id: plain.id, client_id: plain.client_id, client_name: plain.client_name, client_phone: plain.client_phone, status: plain.status },
        period: { from: params.from || null, to: params.to },
        previous_balance: previousBalance,
        total_charges: periodCharges,
        total_payments: periodPayments,
        closing_balance: previousBalance + periodCharges - periodPayments,
        movements,
      };
    } catch (error) {
      console.error('Error al generar corte de crédito:', error);
      throw error;
    }
  }

  async searchAvailableSources(searchTerm = '', limit = 20, sourceType?: Exclude<CreditSourceType, 'manual'>) {
    try {
      if (limit < 1 || limit > 100) limit = 20;
      if (sourceType !== undefined && sourceType !== 'order' && sourceType !== 'simple_order') {
        throw new Error('Tipo de orden de origen inválido');
      }
      return await creditRepository.searchAvailableSources(searchTerm.trim(), limit, sourceType);
    } catch (error) {
      console.error('Error al buscar órdenes disponibles para crédito:', error);
      throw error;
    }
  }
}

export default new CreditService();
