// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentsRepository = require('../repositories/paymentsRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const orderRepository = require('../repositories/orderRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cashSessionRepository = require('../repositories/cashSessionRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientRepository = require('../repositories/clientRepository');

class PaymentsService {
  async getAllPayments() {
    try {
      const payments = await paymentsRepository.findAll();
      return payments.map((p: { toPlainObject: () => unknown }) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener todos los pagos:', error);
      throw new Error('Error al obtener pagos');
    }
  }

  async getPaymentsPaginated(page = 1, limit = 20, filters: Record<string, unknown> = {}) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 500) limit = 20;
      const result = await paymentsRepository.findPaginated(page, limit, filters);
      return { data: result.data.map((p: { toPlainObject: () => unknown }) => p.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener pagos paginados:', error);
      throw new Error('Error al obtener pagos');
    }
  }

  async getPaymentsByOrderId(orderId: number | string) {
    try {
      if (!orderId || isNaN(Number(orderId))) throw new Error('ID de orden inválido');
      const order = await orderRepository.findById(parseInt(String(orderId)));
      if (!order) throw new Error('Orden no encontrada');
      const payments = await paymentsRepository.findByOrderId(parseInt(String(orderId)));
      return payments.map((p: { toPlainObject: () => unknown }) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos por orden:', error);
      throw error;
    }
  }

  async getPaymentById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de pago inválido');
      const payment = await paymentsRepository.findById(parseInt(String(id)));
      if (!payment) throw new Error('Pago no encontrado');
      return payment.toPlainObject();
    } catch (error) {
      console.error('Error al obtener pago:', error);
      throw error;
    }
  }

  async createPayment({ orderId, amount, date, descripcion, info, phone, clientName }: { orderId?: number | string | null; amount: number | string; date: string; descripcion?: string | null; info?: string | null; phone?: string | null; clientName?: string | null }) {
    try {
      const activeSession = await cashSessionRepository.getActive();
      if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar pagos.');
      if (!amount || isNaN(Number(amount)) || parseFloat(String(amount)) <= 0) throw new Error('Monto inválido. Debe ser un número mayor a 0');
      if (!date) throw new Error('La fecha es requerida');

      const paymentDate = new Date(date);
      if (isNaN(paymentDate.getTime())) throw new Error('Fecha de pago inválida');

      if (orderId && !isNaN(Number(orderId))) {
        const order = await orderRepository.findById(parseInt(String(orderId)));
        if (!order) throw new Error('La orden especificada no existe');
        if (order.isCancelled()) throw new Error('No se pueden agregar pagos a órdenes canceladas');

        const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(parseInt(String(orderId)));
        const newTotal = currentPaymentsTotal + parseFloat(String(amount));
        if (newTotal > order.total) {
          const remaining = order.total - currentPaymentsTotal;
          throw new Error(`El pago excede el monto pendiente. Monto restante: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(remaining)}`);
        }

        const payment = await paymentsRepository.create({ order_id: parseInt(String(orderId)), amount: parseFloat(String(amount)), date: paymentDate.toISOString(), descripcion: descripcion?.trim() || null, info: null });
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

        const payment = await paymentsRepository.create({ order_id: null, amount: parseFloat(String(amount)), date: paymentDate.toISOString(), descripcion: descripcion?.trim() || null, info: info.trim(), phone: resolvedPhone?.trim() || null, client_name: resolvedName?.trim() || null });
        const resObj = payment.toPlainObject() as Record<string, unknown>;
        if (wasClientCreated) resObj.clientCreated = true;
        return resObj;
      }
    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  }

  async updatePayment(id: number | string, { amount, descripcion, info, phone, clientName }: { amount?: number | string; descripcion?: string | null; info?: string | null; phone?: string | null; clientName?: string | null }) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de pago inválido');
      const paymentId = parseInt(String(id));
      const existingPayment = await paymentsRepository.findById(paymentId);
      if (!existingPayment) throw new Error('Pago no encontrado');
      if (!existingPayment.canEdit()) throw new Error('No se puede editar un pago de una orden completada o cancelada');

      if (amount !== undefined) {
        if (isNaN(Number(amount)) || parseFloat(String(amount)) <= 0) throw new Error('Monto inválido. Debe ser un número mayor a 0');
        const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(existingPayment.order_id);
        const newTotal = currentPaymentsTotal - existingPayment.amount + parseFloat(String(amount));
        if (existingPayment.hasOrder() && newTotal > existingPayment.order.total) {
          const remaining = existingPayment.order.total - (currentPaymentsTotal - existingPayment.amount);
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

      const updated = await paymentsRepository.update(paymentId, {
        amount: amount !== undefined ? parseFloat(String(amount)) : existingPayment.amount,
        descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : existingPayment.descripcion,
        info: info !== undefined ? (info?.trim() || null) : existingPayment.info,
        phone: resolvedPhone !== undefined ? (resolvedPhone?.trim() || null) : existingPayment.phone,
        client_name: resolvedName !== undefined ? (resolvedName?.trim() || null) : existingPayment.client_name,
      });
      if (!updated) throw new Error('Error al actualizar pago');

      const updatedPayment = await paymentsRepository.findById(paymentId);
      const resObj = updatedPayment.toPlainObject() as Record<string, unknown>;
      if (wasClientCreated) resObj.clientCreated = true;
      return resObj;
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      throw error;
    }
  }

  async deletePayment(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de pago inválido');
      const paymentId = parseInt(String(id));
      const existingPayment = await paymentsRepository.findById(paymentId);
      if (!existingPayment) throw new Error('Pago no encontrado');
      if (!existingPayment.canDelete()) throw new Error('No se puede eliminar un pago de una orden completada o cancelada');
      const deleted = await paymentsRepository.delete(paymentId);
      if (!deleted) throw new Error('Error al eliminar pago');
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      throw error;
    }
  }

  async getPaymentsByClientId(clientId: number | string) {
    try {
      if (!clientId || isNaN(Number(clientId))) throw new Error('ID de cliente inválido');
      const payments = await paymentsRepository.findByClientId(parseInt(String(clientId)));
      return payments.map((p: { toPlainObject: () => unknown }) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos del cliente:', error);
      throw error;
    }
  }
}

module.exports = new PaymentsService();
export {};
