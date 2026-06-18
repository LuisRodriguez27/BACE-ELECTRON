import simpleOrderRepository from '../repositories/simpleOrderRepository';
import cashSessionRepository from '../repositories/cashSessionRepository';
import clientRepository from '../repositories/clientRepository';
import SimpleOrder from '../domain/simpleOrder';
import type { SimpleOrderData, AddSimplePaymentData, UpdateSimplePaymentData } from '../types/simpleOrder';
import db from '../db';

class SimpleOrderService {
  async getAllSimpleOrders() {
    try {
      const orders = await simpleOrderRepository.getAll();
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error in getAllSimpleOrders:', error);
      throw new Error('Hubo un error al obtener las ordenes rápidas.');
    }
  }

  async getSimpleOrderById(id: number) {
    try {
      const order = await simpleOrderRepository.getById(id);
      if (!order) throw new Error('Orden no encontrada.');
      return order.toPlainObject();
    } catch (error) {
      console.error(`Error in getSimpleOrderById (${id}):`, error);
      throw new Error('Hubo un error al obtener la orden.');
    }
  }

  async createSimpleOrder(orderData: SimpleOrderData) {
    try {
      const order = new SimpleOrder({
        id: 0,
        user_id: orderData.user_id || 0,
        date: orderData.date || new Date().toISOString(),
        concept: orderData.concept || '',
        total: orderData.total || 0,
        active: orderData.active ?? true,
        user_username: null,
        client_name: orderData.client_name || '',
        client_phone: orderData.client_phone || '',
        payments: []
      });
      if (!order.isValid()) throw new Error('Los datos de la orden rápida son inválidos. Verifica que el empleado, concepto y total sean correctos.');

      let resolvedName: string | null = order.client_name as string | null;
      let resolvedPhone: string | null = order.client_phone as string | null;

      const transaction = db.transaction(async () => {
        let wasClientCreated = false;
        if (resolvedPhone && resolvedPhone.trim()) {
          const cleanPhone = resolvedPhone.trim();
          const existingClient = await clientRepository.findByPhone(cleanPhone);
          if (existingClient) {
            if (!resolvedName || !resolvedName.trim()) resolvedName = existingClient.name as string;
          } else if (resolvedName && resolvedName.trim()) {
            await clientRepository.create({ name: resolvedName.trim(), phone: cleanPhone });
            wasClientCreated = true;
          }
        }

        const newId = await simpleOrderRepository.create({ user_id: order.user_id, date: order.date || new Date().toISOString(), concept: order.concept, total: order.total, active: order.active, client_name: resolvedName?.trim() || null, client_phone: resolvedPhone?.trim() || null });
        const newOrder = await simpleOrderRepository.getById(newId);
        if (!newOrder) throw new Error('Error al obtener la orden creada');
        const resObj = {
          ...newOrder.toPlainObject(),
          clientCreated: wasClientCreated ? true : undefined,
        };
        return resObj;
      });

      return await transaction();
    } catch (error) {
      console.error('Error in createSimpleOrder:', error);
      throw error;
    }
  }

  async updateSimpleOrder(id: number, orderData: SimpleOrderData) {
    try {
      const existingOrder = await simpleOrderRepository.getById(id);
      if (!existingOrder) throw new Error('Orden no encontrada.');

      let resolvedName: string | null = orderData.client_name !== undefined ? (orderData.client_name as string | null) : (existingOrder.client_name as string | null);
      let resolvedPhone: string | null = orderData.client_phone !== undefined ? (orderData.client_phone as string | null) : (existingOrder.client_phone as string | null);

      const transaction = db.transaction(async () => {
        let wasClientCreated = false;
        if (resolvedPhone && resolvedPhone.trim()) {
          const cleanPhone = resolvedPhone.trim();
          const existingClient = await clientRepository.findByPhone(cleanPhone);
          if (existingClient) {
            if (!resolvedName || !resolvedName.trim()) resolvedName = existingClient.name as string;
          } else if (resolvedName && resolvedName.trim()) {
            await clientRepository.create({ name: resolvedName.trim(), phone: cleanPhone });
            wasClientCreated = true;
          }
        }

        const updatedData = {
          user_id: (orderData.user_id ?? existingOrder.user_id) as number,
          date: (orderData.date ?? existingOrder.date) as string,
          concept: (orderData.concept ?? existingOrder.concept) as string,
          total: (orderData.total ?? existingOrder.total) as number,
          active: orderData.active ?? existingOrder.active,
          client_name: resolvedName?.trim() || null,
          client_phone: resolvedPhone?.trim() || null
        };
        const success = await simpleOrderRepository.update(id, updatedData);
        if (!success) throw new Error('No se pudo actualizar la orden rápida, posiblemente no exista.');

        const updatedOrder = await simpleOrderRepository.getById(id);
        if (!updatedOrder) throw new Error('Error al obtener la orden actualizada');
        const resObj = {
          ...updatedOrder.toPlainObject(),
          clientCreated: wasClientCreated ? true : undefined,
        };
        return resObj;
      });

      return await transaction();
    } catch (error) {
      console.error(`Error in updateSimpleOrder (${id}):`, error);
      throw error;
    }
  }

  async deleteSimpleOrder(id: number) {
    try {
      const transaction = db.transaction(async () => {
        const success = await simpleOrderRepository.delete(id);
        if (!success) throw new Error('No se pudo eliminar la orden rápida, posiblemente no exista.');
      });
      await transaction();
    } catch (error) {
      console.error(`Error in deleteSimpleOrder (${id}):`, error);
      throw error;
    }
  }

  async addPayment(paymentData: AddSimplePaymentData) {
    try {
      const { simple_order_id, user_id, amount, date, descripcion } = paymentData;
      const activeSession = await cashSessionRepository.getActive();
      if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar pagos.');
      if (!simple_order_id || !user_id || typeof amount !== 'number' || amount <= 0) throw new Error('Datos de pago inválidos. Se requiere el ID de la orden, el empleado y un monto mayor a 0.');

      const transaction = db.transaction(async () => {
        const newId = await simpleOrderRepository.addPayment({ simple_order_id, user_id, amount, date: date || new Date().toISOString(), descripcion });
        return await simpleOrderRepository.getPaymentById(newId);
      });

      return await transaction();
    } catch (error) {
      console.error('Error in addPayment:', error);
      throw error;
    }
  }

  async getPayments(simple_order_id: number) {
    try {
      return await simpleOrderRepository.getPayments(simple_order_id);
    } catch (error) {
      console.error(`Error in getPayments (${simple_order_id}):`, error);
      throw new Error('Hubo un error al obtener los pagos de la orden.');
    }
  }

  async updatePayment(id: number, paymentData: UpdateSimplePaymentData) {
    try {
      const transaction = db.transaction(async () => {
        const success = await simpleOrderRepository.updatePayment(id, paymentData);
        if (!success) throw new Error('No se pudo actualizar el pago, posiblemente no exista.');
        return await simpleOrderRepository.getPaymentById(id);
      });

      return await transaction();
    } catch (error) {
      console.error(`Error in updatePayment (${id}):`, error);
      throw error;
    }
  }

  async deletePayment(id: number) {
    try {
      const transaction = db.transaction(async () => {
        const success = await simpleOrderRepository.deletePayment(id);
        if (!success) throw new Error('No se pudo eliminar el pago, posiblemente no exista.');
      });
      await transaction();
    } catch (error) {
      console.error(`Error in deletePayment (${id}):`, error);
      throw error;
    }
  }

  async getSimpleOrdersPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const cleanSearch = searchTerm ? searchTerm.trim() : '';
      const paginatedResult = await simpleOrderRepository.findPaginated(page, limit, cleanSearch);
      return { data: paginatedResult.data.map((o) => o.toPlainObject()), pagination: paginatedResult.pagination, stats: paginatedResult.stats };
    } catch (error) {
      console.error('Error in getSimpleOrdersPaginated:', error);
      throw new Error('Hubo un error al obtener las órdenes rápidas paginadas.');
    }
  }
}

export default new SimpleOrderService();
