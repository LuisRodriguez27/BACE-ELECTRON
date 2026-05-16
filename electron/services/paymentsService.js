const paymentsRepository    = require('../repositories/paymentsRepository');
const orderRepository       = require('../repositories/orderRepository');
const cashSessionRepository = require('../repositories/cashSessionRepository');
const Payment               = require('../domain/payments');

class PaymentsService {

  async getAllPayments() {
    try {
      const payments = await paymentsRepository.findAll();
      return payments.map(payment => payment.toPlainObject());
    } catch (error) {
      console.error('Error al obtener todos los pagos:', error);
      throw new Error('Error al obtener pagos');
    }
  }

  async getPaymentsByOrderId(orderId) {
    try {
      if (!orderId || isNaN(orderId)) {
        throw new Error('ID de orden inválido');
      }

      // Verificar que la orden existe
      const order = await orderRepository.findById(parseInt(orderId));
      if (!order) {
        throw new Error('Orden no encontrada');
      }

      const payments = await paymentsRepository.findByOrderId(parseInt(orderId));
      return payments.map(payment => payment.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos por orden:', error);
      throw error;
    }
  }

  async getPaymentById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de pago inválido');
      }

      const payment = await paymentsRepository.findById(parseInt(id));
      
      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      return payment.toPlainObject();
    } catch (error) {
      console.error('Error al obtene,r pago:', error);
      throw error;
    }
  }

  async createPayment({ orderId, amount, date, descripcion, info }) {
    try {
      // ── Verificar sesión de caja activa ───────────────────────────────
      const activeSession = await cashSessionRepository.getActive();
      if (!activeSession) {
        throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar pagos.');
      }
      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error('Monto inválido. Debe ser un número mayor a 0');
      }

      if (!date) {
        throw new Error('La fecha es requerida');
      }

      // Validar fecha
      const paymentDate = new Date(date);
      if (isNaN(paymentDate.getTime())) {
        throw new Error('Fecha de pago inválida');
      }

      // Pago asociado a una orden
      if (orderId && !isNaN(orderId)) {
        const order = await orderRepository.findById(parseInt(orderId));
        if (!order) {
          throw new Error('La orden especificada no existe');
        }

        if (order.isCancelled()) {
          throw new Error('No se pueden agregar pagos a órdenes canceladas');
        }

        // Validar que no se exceda el total de la orden
        const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(parseInt(orderId));
        const newTotal = currentPaymentsTotal + parseFloat(amount);
        
        if (newTotal > order.total) {
          const remaining = order.total - currentPaymentsTotal;
          throw new Error(`El pago excede el monto pendiente. Monto restante: ${new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
          }).format(remaining)}`);
        }

        const payment = await paymentsRepository.create({
          order_id: parseInt(orderId),
          amount: parseFloat(amount),
          date: paymentDate.toISOString(),
          descripcion: descripcion?.trim() || null,
          info: null
        });

        return payment.toPlainObject();
      }

      // Pago libre (sin orden) — requiere info
      if (!info || !info.trim()) {
        throw new Error('El campo "info" es requerido para pagos sin orden');
      }

      const payment = await paymentsRepository.create({
        order_id: null,
        amount: parseFloat(amount),
        date: paymentDate.toISOString(),
        descripcion: descripcion?.trim() || null,
        info: info.trim()
      });

      return payment.toPlainObject();

    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  }

  async updatePayment(id, { amount, descripcion }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de pago inválido');
      }

      const paymentId = parseInt(id);

      // Verificar si el pago existe
      const existingPayment = await paymentsRepository.findById(paymentId);
      if (!existingPayment) {
        throw new Error('Pago no encontrado');
      }

      // Validar que se puede editar
      if (!existingPayment.canEdit()) {
        throw new Error('No se puede editar un pago de una orden completada o cancelada');
      }

      // Validar amount si se proporciona
      if (amount !== undefined) {
        if (isNaN(amount) || parseFloat(amount) <= 0) {
          throw new Error('Monto inválido. Debe ser un número mayor a 0');
        }

        // Validar que no se exceda el total de la orden
        const currentPaymentsTotal = await paymentsRepository.getTotalPaymentsByOrderId(existingPayment.order_id);
        const newTotal = currentPaymentsTotal - existingPayment.amount + parseFloat(amount);
        
        if (existingPayment.hasOrder() && newTotal > existingPayment.order.total) {
          const remaining = existingPayment.order.total - (currentPaymentsTotal - existingPayment.amount);
          throw new Error(`El pago actualizado excede el monto pendiente. Monto máximo: ${new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
          }).format(remaining)}`);
        }
      }

      // Actualizar pago
      const updated = await paymentsRepository.update(paymentId, {
        amount: amount !== undefined ? parseFloat(amount) : existingPayment.amount,
        descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : existingPayment.descripcion
      });

      if (!updated) {
        throw new Error('Error al actualizar pago');
      }

      // Obtener pago actualizado
      const updatedPayment = await paymentsRepository.findById(paymentId);
      return updatedPayment.toPlainObject();

    } catch (error) {
      console.error('Error al actualizar pago:', error);
      throw error;
    }
  }

  async deletePayment(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de pago inválido');
      }

      const paymentId = parseInt(id);

      // Verificar si el pago existe
      const existingPayment = await paymentsRepository.findById(paymentId);
      if (!existingPayment) {
        throw new Error('Pago no encontrado');
      }

      // Validar que se puede eliminar
      if (!existingPayment.canDelete()) {
        throw new Error('No se puede eliminar un pago de una orden completada o cancelada');
      }

      const deleted = await paymentsRepository.delete(paymentId);

      if (!deleted) {
        throw new Error('Error al eliminar pago');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      throw error;
    }
  }

  async getPaymentsByClientId(clientId) {
    try {
      if (!clientId || isNaN(clientId)) {
        throw new Error('ID de cliente inválido');
      }

      const payments = await paymentsRepository.findByClientId(parseInt(clientId));
      return payments.map(payment => payment.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos del cliente:', error);
      throw error;
    }
  }
}

module.exports = new PaymentsService();
