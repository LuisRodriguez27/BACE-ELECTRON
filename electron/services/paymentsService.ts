import paymentsRepository, { PaymentFilters } from '../repositories/paymentsRepository';
import orderRepository from '../repositories/orderRepository';
import cashSessionRepository from '../repositories/cashSessionRepository';
import clientRepository from '../repositories/clientRepository';
import db from '../db';
import type { CreatePaymentData, UpdatePaymentData } from '../types/payment';

class PaymentsService {
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
      const { orderId, amount, date, descripcion, info, phone, clientName } = data;
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

          const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(orderId);
          const newTotal = currentPaymentsTotal + amount;
          if (newTotal > order.total) {
            const remaining = order.total - currentPaymentsTotal;
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

      if (amount !== undefined) {
        if (isNaN(amount) || amount <= 0) throw new Error('Monto inválido. Debe ser un número mayor a 0');
        const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(existingPayment.order_id as number);
        const newTotal = currentPaymentsTotal - existingPayment.amount + amount;
        if (existingPayment.hasOrder() && existingPayment.order && newTotal > (existingPayment.order.total as number)) {
          const remaining = (existingPayment.order.total as number) - (currentPaymentsTotal - existingPayment.amount);
          throw new Error(`El pago actualizado excede el monto pendiente. Monto máximo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(remaining)}`);
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
        const updated = await paymentsRepository.update(id, {
          amount: amount !== undefined ? amount : existingPayment.amount,
          descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : existingPayment.descripcion,
          info: info !== undefined ? (info?.trim() || null) : existingPayment.info,
          phone: resolvedPhone !== undefined ? (resolvedPhone?.trim() || null) : existingPayment.phone,
          client_name: resolvedName !== undefined ? (resolvedName?.trim() || null) : existingPayment.client_name,
        });
        if (!updated) throw new Error('Error al actualizar pago');

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

      const transaction = db.transaction(async () => {
        const deleted = await paymentsRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar pago');
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
