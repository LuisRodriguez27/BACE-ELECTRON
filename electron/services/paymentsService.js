const paymentsRepository = require('../repositories/paymentsRepository');
const orderRepository = require('../repositories/orderRepository');
const Payment = require('../domain/payments');

class PaymentsService {

  async getAllPayments() {
    try {
      const payments = paymentsRepository.findAll();
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
      const order = orderRepository.findById(parseInt(orderId));
      if (!order) {
        throw new Error('Orden no encontrada');
      }

      const payments = paymentsRepository.findByOrderId(parseInt(orderId));
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

      const payment = paymentsRepository.findById(parseInt(id));
      
      if (!payment) {
        throw new Error('Pago no encontrado');
      }

      return payment.toPlainObject();
    } catch (error) {
      console.error('Error al obtener pago:', error);
      throw error;
    }
  }

  async createPayment({ orderId, amount, date, descripcion }) {
    try {
      // Validaciones de negocio
      if (!orderId || isNaN(orderId)) {
        throw new Error('ID de orden inválido');
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

      // Verificar que la orden exists
      const order = orderRepository.findById(parseInt(orderId));
      if (!order) {
        throw new Error('La orden especificada no existe');
      }

      // Validaciones de negocio específicas de pagos
      if (order.isCancelled()) {
        throw new Error('No se pueden agregar pagos a órdenes canceladas');
      }

      // Validar que no se exceda el total de la orden
      const currentPaymentsTotal = paymentsRepository.getTotalPaymentsByOrderId(parseInt(orderId));
      const newTotal = currentPaymentsTotal + parseFloat(amount);
      
      if (newTotal > order.total) {
        const remaining = order.total - currentPaymentsTotal;
        throw new Error(`El pago excede el monto pendiente. Monto restante: ${new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(remaining)}`);
      }

      // Crear pago
      const payment = paymentsRepository.create({
        order_id: parseInt(orderId),
        amount: parseFloat(amount),
        date: paymentDate.toISOString(),
        descripcion: descripcion?.trim() || null
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
      const existingPayment = paymentsRepository.findById(paymentId);
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
        const currentPaymentsTotal = paymentsRepository.getTotalPaymentsByOrderId(existingPayment.order_id);
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
      const updated = paymentsRepository.update(paymentId, {
        amount: amount !== undefined ? parseFloat(amount) : existingPayment.amount,
        descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : existingPayment.descripcion
      });

      if (!updated) {
        throw new Error('Error al actualizar pago');
      }

      // Obtener pago actualizado
      const updatedPayment = paymentsRepository.findById(paymentId);
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
      const existingPayment = paymentsRepository.findById(paymentId);
      if (!existingPayment) {
        throw new Error('Pago no encontrado');
      }

      // Validar que se puede eliminar
      if (!existingPayment.canDelete()) {
        throw new Error('No se puede eliminar un pago de una orden completada o cancelada');
      }

      const deleted = paymentsRepository.delete(paymentId);

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

      const payments = paymentsRepository.findByClientId(parseInt(clientId));
      return payments.map(payment => payment.toPlainObject());
    } catch (error) {
      console.error('Error al obtener pagos del cliente:', error);
      throw error;
    }
  }
}

module.exports = new PaymentsService();
