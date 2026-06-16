const simpleOrderRepository  = require('../repositories/simpleOrderRepository');
const cashSessionRepository  = require('../repositories/cashSessionRepository');
const clientRepository       = require('../repositories/clientRepository');
const SimpleOrder            = require('../domain/simpleOrder');

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

      let resolvedName = order.client_name;
      let resolvedPhone = order.client_phone;
      let wasClientCreated = false;

      if (resolvedPhone && resolvedPhone.trim()) {
        const cleanPhone = resolvedPhone.trim();
        const existingClient = await clientRepository.findByPhone(cleanPhone);
        if (existingClient) {
          if (!resolvedName || !resolvedName.trim()) {
            resolvedName = existingClient.name;
          }
        } else if (resolvedName && resolvedName.trim()) {
          await clientRepository.create({
            name: resolvedName.trim(),
            phone: cleanPhone
          });
          wasClientCreated = true;
        }
      }

      const newId = await simpleOrderRepository.create({
        user_id: order.user_id,
        date: order.date || new Date().toISOString(),
        concept: order.concept,
        total: order.total,
        active: order.active,
        client_name: resolvedName?.trim() || null,
        client_phone: resolvedPhone?.trim() || null
      });

      const newOrder = await simpleOrderRepository.getById(newId);
      const resObj = newOrder.toPlainObject();
      if (wasClientCreated) {
        resObj.clientCreated = true;
      }
      return resObj;
    } catch (error) {
      console.error('Error in createSimpleOrder:', error);
      throw new Error('Hubo un error al crear la orden rápida.');
    }
  }

  async updateSimpleOrder(id, orderData) {
    try {
      const existingOrder = await simpleOrderRepository.getById(id);
      if (!existingOrder) {
        throw new Error('Orden no encontrada.');
      }

      let resolvedName = orderData.client_name !== undefined ? orderData.client_name : existingOrder.client_name;
      let resolvedPhone = orderData.client_phone !== undefined ? orderData.client_phone : existingOrder.client_phone;
      let wasClientCreated = false;

      if (resolvedPhone && resolvedPhone.trim()) {
        const cleanPhone = resolvedPhone.trim();
        const existingClient = await clientRepository.findByPhone(cleanPhone);
        if (existingClient) {
          if (!resolvedName || !resolvedName.trim()) {
            resolvedName = existingClient.name;
          }
        } else if (resolvedName && resolvedName.trim()) {
          await clientRepository.create({
            name: resolvedName.trim(),
            phone: cleanPhone
          });
          wasClientCreated = true;
        }
      }

      const updatedData = {
        ...orderData,
        client_name: resolvedName?.trim() || null,
        client_phone: resolvedPhone?.trim() || null
      };

      const success = await simpleOrderRepository.update(id, updatedData);
      if (!success) {
        throw new Error('No se pudo actualizar la orden rápida, posiblemente no exista.');
      }
      const updatedOrder = await simpleOrderRepository.getById(id);
      const resObj = updatedOrder.toPlainObject();
      if (wasClientCreated) {
        resObj.clientCreated = true;
      }
      return resObj;
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

      // ── Verificar sesión de caja activa ─────────────────────────────
      const activeSession = await cashSessionRepository.getActive();
      if (!activeSession) {
        throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar pagos.');
      }

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
      throw error;
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

  async getSimpleOrdersPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const cleanSearch = searchTerm ? searchTerm.trim() : '';

      const paginatedResult = await simpleOrderRepository.findPaginated(pageNum, limitNum, cleanSearch);
      
      return {
        data: paginatedResult.data.map(order => order.toPlainObject()),
        pagination: paginatedResult.pagination,
        stats: paginatedResult.stats
      };
    } catch (error) {
      console.error('Error in getSimpleOrdersPaginated:', error);
      throw new Error('Hubo un error al obtener las órdenes rápidas paginadas.');
    }
  }
}

module.exports = new SimpleOrderService();
