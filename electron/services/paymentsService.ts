import paymentsRepository, { PaymentFilters } from '../repositories/paymentsRepository';
import orderRepository from '../repositories/orderRepository';
import cashSessionRepository from '../repositories/cashSessionRepository';
import clientRepository from '../repositories/clientRepository';
import creditRepository from '../repositories/creditRepository';
import db from '../db';
import type { CreatePaymentData, UpdatePaymentData } from '../types/payment';

class PaymentsService {
  private async allocateCreditPaymentFifo(creditId: number, paymentId: number, amount: number): Promise<void> {
    let remaining = amount;
    const items = await creditRepository.getItemsWithOutstandingBalance(creditId);
    for (const item of items) {
      if (remaining <= 0.01) break;
      const outstanding = item.total - item.allocated_amount;
      const allocation = Math.min(remaining, outstanding);
      if (allocation <= 0.01) continue;
      await creditRepository.addPaymentAllocation(paymentId, item.id, allocation);
      remaining -= allocation;
    }
    if (remaining > 0.01) throw new Error('El abono no pudo distribuirse entre los cargos pendientes del crédito');
  }

  private async reallocateCreditPaymentsFifo(creditId: number): Promise<void> {
    await creditRepository.removeCreditPaymentAllocations(creditId);
    const payments = await creditRepository.getPaymentAmountsByCreditId(creditId);
    for (const payment of payments) {
      await this.allocateCreditPaymentFifo(creditId, payment.id, payment.amount);
    }
  }

  async getAllPayments() {
    try {
      const payments = await paymentsRepository.findAll();
      return payments.map((p) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener todos los pagos:', error);
      throw new Error('Error al obtener pagos');
    }
  }

  async getPaymentsPaginated(page = 1, limit = 20, filters: PaymentFilters = {}) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 500) limit = 20;
      const result = await paymentsRepository.findPaginated(page, limit, filters);
      return { data: result.data.map((p) => p.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener pagos paginados:', error);
      throw new Error('Error al obtener pagos');
    }
  }

  async getPaymentsByOrderId(orderId: number) {
    try {
      if (!orderId || orderId <= 0) throw new Error('ID de orden inválido');
      const order = await orderRepository.findById(orderId);
      if (!order) throw new Error('Orden no encontrada');
      const payments = await paymentsRepository.findByOrderId(orderId);
      return payments.map((p) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos por orden:', error);
      throw error;
    }
  }

  async getPaymentById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de pago inválido');
      const payment = await paymentsRepository.findById(id);
      if (!payment) throw new Error('Pago no encontrado');
      return payment.toPlainObject();
    } catch (error) {
      console.error('Error al obtener pago:', error);
      throw error;
    }
  }

  async createPayment(data: CreatePaymentData) {
    try {
      const { orderId, created_by, amount, date, descripcion, info, phone, clientName } = data;
      const activeSession = await cashSessionRepository.getActive();
      if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar pagos.');
      if (!amount || isNaN(amount) || amount <= 0) throw new Error('Monto inválido. Debe ser un número mayor a 0');
      if (!date) throw new Error('La fecha es requerida');

      const paymentDate = new Date(date);
      if (isNaN(paymentDate.getTime())) throw new Error('Fecha de pago inválida');

      const transaction = db.transaction(async () => {
        if (orderId && orderId > 0) {
          const order = await orderRepository.findById(orderId);
          if (!order) throw new Error('La orden especificada no existe');
          if (order.isCancelled()) throw new Error('No se pueden agregar pagos a órdenes canceladas');

          const creditItem = await creditRepository.getActiveItemByOrder(orderId);
          if (creditItem) {
            if (!created_by || created_by <= 0) throw new Error('No hay un usuario activo para registrar el abono al crédito');
            if (!await creditRepository.lockById(creditItem.credit_id)) throw new Error('El crédito relacionado no existe');
            const credit = await creditRepository.findById(creditItem.credit_id);
            if (!credit || !credit.isOpen()) throw new Error('No se pueden registrar pagos en un crédito cerrado');

            const allocatedToSource = await creditRepository.getAllocatedAmountForItem(creditItem.id);
            const sourcePending = creditItem.total - allocatedToSource;
            if (amount > sourcePending + 0.01) {
              throw new Error(`El pago excede el saldo pendiente de esta orden dentro del crédito. Monto restante: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sourcePending)}`);
            }
            if (amount > credit.getBalance() + 0.01) {
              throw new Error(`El pago excede el saldo del crédito. Saldo pendiente: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(credit.getBalance())}`);
            }

            const payment = await paymentsRepository.create({
              order_id: null,
              credit_id: credit.id,
              created_by: created_by ?? null,
              amount,
              date: paymentDate.toISOString(),
              descripcion: descripcion?.trim() ?? null,
              info: info?.trim() || `Abono a crédito #${credit.id} desde orden #${orderId}`,
              phone: credit.client_phone,
              client_name: credit.client_name,
            });
            if (!payment) throw new Error('Error al registrar el abono al crédito');
            await creditRepository.addPaymentAllocation(payment.id, creditItem.id, amount);
            // El cliente lo inició desde la orden: devolver esa referencia para que la UI se actualice de inmediato.
            return { ...payment.toPlainObject(), order_id: orderId };
          }

          const currentPaymentsTotal = await paymentsRepository.getDirectPaymentsByOrderId(orderId);
          const creditedAmount = await creditRepository.getCreditedAmountByOrder(orderId);
          const newTotal = currentPaymentsTotal + creditedAmount + amount;
          if (newTotal > order.total) {
            const remaining = order.total - currentPaymentsTotal - creditedAmount;
            throw new Error(`El pago excede el monto pendiente. Monto restante: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(remaining)}`);
          }

          const payment = await paymentsRepository.create({ order_id: orderId, amount, date: paymentDate.toISOString(), descripcion: descripcion?.trim() ?? null, info: null });
          if (!payment) throw new Error('Error al registrar pago');
          return payment.toPlainObject();
        } else {
          if (!info || !info.trim()) throw new Error('El campo "info" es requerido para pagos sin orden');

          let resolvedName: string | null | undefined = clientName;
          let resolvedPhone: string | null | undefined = phone;
          let wasClientCreated = false;

          if (phone && phone.trim()) {
            const cleanPhone = phone.trim();
            const existingClient = await clientRepository.findByPhone(cleanPhone);
            if (existingClient) {
              if (!clientName || !clientName.trim()) resolvedName = existingClient.name as string;
            } else if (clientName && clientName.trim()) {
              await clientRepository.create({ name: clientName.trim(), phone: cleanPhone });
              wasClientCreated = true;
            }
          }

          const payment = await paymentsRepository.create({ order_id: null, amount, date: paymentDate.toISOString(), descripcion: descripcion?.trim() ?? null, info: info.trim(), phone: resolvedPhone?.trim() ?? null, client_name: resolvedName?.trim() ?? null });
          if (!payment) throw new Error('Error al registrar pago');
          const resObj = {
            ...payment.toPlainObject(),
            clientCreated: wasClientCreated ? true : undefined,
          };
          return resObj;
        }
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  }

  async updatePayment(id: number, data: UpdatePaymentData) {
    try {
      const { amount, descripcion, info, phone, clientName } = data;
      if (!id || id <= 0) throw new Error('ID de pago inválido');
      const existingPayment = await paymentsRepository.findById(id);
      if (!existingPayment) throw new Error('Pago no encontrado');
      if (!existingPayment.canEdit()) throw new Error('No se puede editar un pago de una orden completada o cancelada');
      if (existingPayment.credit_id) {
        const credit = await creditRepository.findById(existingPayment.credit_id);
        if (!credit) throw new Error('El crédito relacionado ya no existe');
        if (!credit.isOpen()) throw new Error('No se puede editar un abono de un crédito cerrado');
        if (phone !== undefined || clientName !== undefined) {
          throw new Error('El cliente de un abono de crédito se obtiene de la cuenta y no puede modificarse desde Pagos');
        }
      }

      if (amount !== undefined) {
        if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido. Debe ser un número mayor a 0');
        if (existingPayment.credit_id) {
          const credit = await creditRepository.findById(existingPayment.credit_id);
          if (!credit) throw new Error('El crédito relacionado ya no existe');
          const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByCreditId(existingPayment.credit_id);
          const maximum = credit.getTotalCharges() - (currentPaymentsTotal - existingPayment.amount);
          if (amount > maximum + 0.01) {
            throw new Error(`El pago actualizado excede el saldo del crédito. Monto máximo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(maximum)}`);
          }
        } else if (existingPayment.hasOrder() && existingPayment.order) {
          const currentPaymentsTotal = await paymentsRepository.getDirectPaymentsByOrderId(existingPayment.order_id as number);
          const creditedAmount = await creditRepository.getCreditedAmountByOrder(existingPayment.order_id as number);
          const newTotal = currentPaymentsTotal - existingPayment.amount + creditedAmount + amount;
          if (newTotal > (existingPayment.order.total as number)) {
            const remaining = (existingPayment.order.total as number) - (currentPaymentsTotal - existingPayment.amount) - creditedAmount;
            throw new Error(`El pago actualizado excede el monto pendiente. Monto máximo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(remaining)}`);
          }
        }
      }

      let resolvedName: string | null = clientName !== undefined ? clientName : (existingPayment.client_name as string | null);
      let resolvedPhone: string | null = phone !== undefined ? phone : (existingPayment.phone as string | null);
      let wasClientCreated = false;

      if (phone !== undefined && phone && phone.trim()) {
        const cleanPhone = phone.trim();
        const existingClient = await clientRepository.findByPhone(cleanPhone);
        if (existingClient) {
          if (!resolvedName || !resolvedName.trim()) resolvedName = existingClient.name as string;
        } else if (resolvedName && resolvedName.trim()) {
          await clientRepository.create({ name: resolvedName.trim(), phone: cleanPhone });
          wasClientCreated = true;
        }
      }

      const transaction = db.transaction(async () => {
        if (existingPayment.credit_id && !await creditRepository.lockById(existingPayment.credit_id)) {
          throw new Error('El crédito relacionado ya no existe');
        }
        const updated = await paymentsRepository.update(id, {
          amount: amount !== undefined ? amount : existingPayment.amount,
          descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : existingPayment.descripcion,
          info: info !== undefined ? (info?.trim() || null) : existingPayment.info,
          phone: resolvedPhone !== undefined ? (resolvedPhone?.trim() || null) : existingPayment.phone,
          client_name: resolvedName !== undefined ? (resolvedName?.trim() || null) : existingPayment.client_name,
        });
        if (!updated) throw new Error('Error al actualizar pago');

        if (existingPayment.credit_id && amount !== undefined) {
          await this.reallocateCreditPaymentsFifo(existingPayment.credit_id);
        }

        const updatedPayment = await paymentsRepository.findById(id);
        if (!updatedPayment) throw new Error('Error al obtener pago actualizado');
        const resObj = {
          ...updatedPayment.toPlainObject(),
          clientCreated: wasClientCreated ? true : undefined,
        };
        return resObj;
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      throw error;
    }
  }

  async deletePayment(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de pago inválido');
      const existingPayment = await paymentsRepository.findById(id);
      if (!existingPayment) throw new Error('Pago no encontrado');
      if (!existingPayment.canDelete()) throw new Error('No se puede eliminar un pago de una orden completada o cancelada');
      if (existingPayment.credit_id) {
        const credit = await creditRepository.findById(existingPayment.credit_id);
        if (!credit) throw new Error('El crédito relacionado ya no existe');
        if (!credit.isOpen()) throw new Error('No se puede eliminar un abono de un crédito cerrado');
      }

      const transaction = db.transaction(async () => {
        if (existingPayment.credit_id && !await creditRepository.lockById(existingPayment.credit_id)) {
          throw new Error('El crédito relacionado ya no existe');
        }
        const deleted = await paymentsRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar pago');
        if (existingPayment.credit_id) await this.reallocateCreditPaymentsFifo(existingPayment.credit_id);
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      throw error;
    }
  }

  async getPaymentsByClientId(clientId: number) {
    try {
      if (!clientId || clientId <= 0) throw new Error('ID de cliente inválido');
      const payments = await paymentsRepository.findByClientId(clientId);
      return payments.map((p) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos del cliente:', error);
      throw error;
    }
  }
}

export default new PaymentsService();
