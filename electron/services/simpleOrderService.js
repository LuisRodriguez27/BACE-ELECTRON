const simpleOrderRepository = require('../repositories/simpleOrderRepository');
const SimpleOrder = require('../domain/simpleOrder');

class SimpleOrderService {
  async getAllSimpleOrders() {
    try {
      const orders = await simpleOrderRepository.getAll();
      return orders.map(order => order.toPlainObject());
    } catch (error) {
      console.error('Error in getAllSimpleOrders:', error);
      throw new Error('Hubo un error al obtener las ordenes rápidas.');
    }
  }

  async getSimpleOrderById(id) {
    try {
      const order = await simpleOrderRepository.getById(id);
      if (!order) {
        throw new Error('Orden no encontrada.');
      }
      return order.toPlainObject();
    } catch (error) {
      console.error(`Error in getSimpleOrderById (${id}):`, error);
      throw new Error('Hubo un error al obtener la orden.');
    }
  }

  async createSimpleOrder(orderData) {
    try {
      const order = new SimpleOrder(orderData);

      if (!order.isValid()) {
        throw new Error('Los datos de la orden rápida son inválidos. Verifica que el empleado, concepto y total sean correctos.');
      }

      const newId = await simpleOrderRepository.create({
        user_id: order.user_id,
        date: order.date || new Date().toISOString(),
        concept: order.concept,
        total: order.total,
        active: order.active
      });

      const newOrder = await simpleOrderRepository.getById(newId);
      return newOrder.toPlainObject();
    } catch (error) {
      console.error('Error in createSimpleOrder:', error);
      throw new Error('Hubo un error al crear la orden rápida.');
    }
  }

  async updateSimpleOrder(id, orderData) {
    try {
      const success = await simpleOrderRepository.update(id, orderData);
      if (!success) {
        throw new Error('No se pudo actualizar la orden rápida, posiblemente no exista.');
      }
      const updatedOrder = await simpleOrderRepository.getById(id);
      return updatedOrder.toPlainObject();
    } catch (error) {
      console.error(`Error in updateSimpleOrder (${id}):`, error);
      throw new Error('Hubo un error al actualizar la orden rápida.');
    }
  }

  async deleteSimpleOrder(id) {
    try {
      const success = await simpleOrderRepository.delete(id);
      if (!success) {
        throw new Error('No se pudo eliminar la orden rápida, posiblemente no exista.');
      }
    } catch (error) {
      console.error(`Error in deleteSimpleOrder (${id}):`, error);
      throw new Error('Hubo un error al eliminar la orden rápida.');
    }
  }

  async addPayment(paymentData) {
    try {
      const { simple_order_id, user_id, amount, date, descripcion } = paymentData;

      if (!simple_order_id || !user_id || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Datos de pago inválidos. Se requiere el ID de la orden, el empleado y un monto mayor a 0.');
      }

      const newId = await simpleOrderRepository.addPayment({
        simple_order_id,
        user_id,
        amount,
        date: date || new Date().toISOString(),
        descripcion
      });

      const newPayment = await simpleOrderRepository.getPaymentById(newId);
      return newPayment;
    } catch (error) {
      console.error('Error in addPayment:', error);
      throw new Error('Hubo un error al registrar el pago.');
    }
  }

  async getPayments(simple_order_id) {
    try {
      const payments = await simpleOrderRepository.getPayments(simple_order_id);
      return payments;
    } catch (error) {
      console.error(`Error in getPayments (${simple_order_id}):`, error);
      throw new Error('Hubo un error al obtener los pagos de la orden.');
    }
  }

  async updatePayment(id, paymentData) {
    try {
      const success = await simpleOrderRepository.updatePayment(id, paymentData);
      if (!success) {
        throw new Error('No se pudo actualizar el pago, posiblemente no exista.');
      }
      const updatedPayment = await simpleOrderRepository.getPaymentById(id);
      return updatedPayment;
    } catch (error) {
      console.error(`Error in updatePayment (${id}):`, error);
      throw new Error('Hubo un error al actualizar el pago.');
    }
  }

  async deletePayment(id) {
    try {
      const success = await simpleOrderRepository.deletePayment(id);
      if (!success) {
        throw new Error('No se pudo eliminar el pago, posiblemente no exista.');
      }
    } catch (error) {
      console.error(`Error in deletePayment (${id}):`, error);
      throw new Error('Hubo un error al eliminar el pago.');
    }
  }
}

module.exports = new SimpleOrderService();
