import orderRepository from '../repositories/orderRepository';
import clientRepository from '../repositories/clientRepository';
import userRepository from '../repositories/userRepository';
import productRepository from '../repositories/productRepository';
import productTemplateRepository from '../repositories/productTemplateRepository';
import Order from '../domain/order';
import type { OrderItem, OrderData } from '../types/order';
import db from '../db';

class OrderService {
  async getAllOrders() {
    try {
      const orders = await orderRepository.findAll();
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes:', error);
      throw new Error('Error al obtener órdenes');
    }
  }

  async getOrderById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden inválido');
      const order = await orderRepository.findById(id);
      if (!order) throw new Error('Orden no encontrada');
      return order.toPlainObject();
    } catch (error) {
      console.error('Error al obtener orden:', error);
      throw error;
    }
  }

  async getOrdersByClientId(clientId: number) {
    try {
      if (!clientId || clientId <= 0) throw new Error('ID de cliente inválido');
      const orders = await orderRepository.findByClientId(clientId);
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes del cliente:', error);
      throw error;
    }
  }

  async getPendingOrdersForLogbook() {
    try {
      const orders = await orderRepository.findPendingForLogbook();
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener bitácora de órdenes:', error);
      throw new Error('Error al obtener bitácora de órdenes');
    }
  }

  async getSales() {
    try {
      const sales = await orderRepository.findCompleted();
      return sales.map((s) => s.toPlainObject());
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      throw new Error('Error al obtener ventas');
    }
  }

  async getSalesPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await orderRepository.findCompletedPaginated(page, limit, searchTerm);
      return { data: result.data.map((s) => s.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener ventas paginadas:', error);
      throw new Error('Error al obtener ventas paginadas');
    }
  }

  async createOrder(orderData: OrderData) {
    try {
      const { client_id, user_id, date, estimated_delivery_date, status, responsable, notes, description } = orderData;

      let items: OrderItem[];
      if (orderData.items) {
        items = orderData.items;
      } else if (orderData.products) {
        console.warn('Usando estructura legacy "products". Considera migrar a "items"');
        items = orderData.products.map(product => ({ product_id: product.product_id, template_id: product.template_id || null, quantity: Number(product.quantity), unit_price: Number(product.unit_price) || 0 }));
      } else {
        throw new Error('Se requiere "items" o "products" en los datos de la orden');
      }

      if (!client_id || client_id <= 0) throw new Error('ID de cliente inválido');
      if (!user_id || user_id <= 0) throw new Error('ID de usuario inválido');
      if (!date) throw new Error('La fecha es requerida');
      if (!items || !Array.isArray(items) || items.length === 0) throw new Error('La orden debe contener al menos un producto o plantilla');

      const client = await clientRepository.findById(client_id);
      if (!client) throw new Error('El cliente especificado no existe');
      const user = await userRepository.findById(user_id);
      if (!user) throw new Error('El usuario especificado no existe');

      const orderDate = new Date(date);
      if (isNaN(orderDate.getTime())) throw new Error('Fecha de orden inválida');

      if (estimated_delivery_date) {
        const deliveryDate = new Date(estimated_delivery_date);
        if (isNaN(deliveryDate.getTime())) throw new Error('Fecha estimada de entrega inválida');
        const comparisonOrderDate = new Date(orderDate);
        comparisonOrderDate.setHours(0, 0, 0, 0);
        const comparisonDeliveryDate = new Date(deliveryDate.getUTCFullYear(), deliveryDate.getUTCMonth(), deliveryDate.getUTCDate());
        if (comparisonDeliveryDate < comparisonOrderDate) throw new Error('La fecha de entrega no puede ser anterior a la fecha de la orden');
      }

      const validStatus = status || 'Revision';
      if (!Order.isValidStatus(validStatus)) throw new Error('Estado de orden inválido');
      const validResponsable = responsable || Order.RESPONSABLE.MOSTRADOR;
      if (!Order.isValidResponsable(validResponsable)) throw new Error('Responsable inválido. Debe ser Mostrador o Maquila');

      for (const [index, item] of items.entries()) {
        const hasProduct = item.product_id != null;
        const hasTemplate = item.template_id != null;
        if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
        if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
        if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
        if (item.unit_price === undefined || item.unit_price === null || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
        if (hasProduct) { const e = await productRepository.findById(item.product_id!); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
        if (hasTemplate) { const e = await productTemplateRepository.findById(item.template_id!); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
      }

      const orderToCreate = {
        client_id, user_id, date: orderDate.toISOString(),
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : null,
        status: validStatus, responsable: validResponsable, notes: notes?.trim() || null, description: description?.trim() || null,
        items: items.map(item => ({ product_id: item.product_id ? item.product_id : null, template_id: item.template_id ? item.template_id : null, quantity: Number(item.quantity), unit_price: Number(item.unit_price), is_delivered: item.is_delivered === true, is_paid: item.is_paid === true }))
      };

      const transaction = db.transaction(async () => {
        const order = await orderRepository.create(orderToCreate);
        if (!order) throw new Error('Error al crear orden');
        return order.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear orden:', error);
      throw error;
    }
  }

  async updateOrder(id: number, orderData: OrderData) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden inválido');
      const existingOrder = await orderRepository.findById(id);
      if (!existingOrder) throw new Error('Orden no encontrada');
      if (!existingOrder.canEdit()) throw new Error('No se puede editar una orden cancelada');

      const { estimated_delivery_date, status, responsable, notes, description, edited_by, items, client_id, date } = orderData;

      if (client_id) {
        if (client_id <= 0) throw new Error('ID de cliente inválido');
        const client = await clientRepository.findById(client_id);
        if (!client) throw new Error('El cliente especificado no existe');
      }
      if (estimated_delivery_date) {
        const deliveryDate = new Date(estimated_delivery_date);
        if (isNaN(deliveryDate.getTime())) throw new Error('Fecha estimada de entrega inválida');
        const orderDate = date ? new Date(date) : new Date(existingOrder.date);
        const comparisonOrderDate = new Date(orderDate); comparisonOrderDate.setHours(0, 0, 0, 0);
        const comparisonDeliveryDate = new Date(deliveryDate.getUTCFullYear(), deliveryDate.getUTCMonth(), deliveryDate.getUTCDate());
        if (comparisonDeliveryDate < comparisonOrderDate) throw new Error('La fecha de entrega no puede ser anterior a la fecha de la orden');
      }
      if (status && !Order.isValidStatus(status)) throw new Error('Estado de orden inválido');
      if (responsable && !Order.isValidResponsable(responsable)) throw new Error('Responsable inválido. Debe ser Mostrador o Maquila');
      if (edited_by) {
        if (edited_by <= 0) throw new Error('ID de usuario editor inválido');
        const editorUser = await userRepository.findById(edited_by);
        if (!editorUser) throw new Error('El usuario editor especificado no existe');
      }

      if (items) {
        if (!Array.isArray(items)) throw new Error('El campo "items" debe ser un array');
        if (items.length === 0) throw new Error('La orden debe contener al menos un producto o plantilla');
        for (const [index, item] of items.entries()) {
          const hasProduct = item.product_id != null; const hasTemplate = item.template_id != null;
          if (!hasProduct && !hasTemplate) throw new Error(`Item ${index + 1}: Debe especificar un product_id o template_id`);
          if (hasProduct && hasTemplate) throw new Error(`Item ${index + 1}: No puede tener tanto product_id como template_id`);
          if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 0.0001) throw new Error(`Item ${index + 1}: Cantidad inválida`);
          if (item.unit_price == null || isNaN(Number(item.unit_price)) || Number(item.unit_price) < 0) throw new Error(`Item ${index + 1}: Precio unitario inválido`);
          if (hasProduct) { const e = await productRepository.findById(item.product_id!); if (!e) throw new Error(`Item ${index + 1}: El producto especificado no existe`); }
          if (hasTemplate) { const e = await productTemplateRepository.findById(item.template_id!); if (!e) throw new Error(`Item ${index + 1}: La plantilla especificada no existe`); }
        }
      }

      const updatePayload: OrderData = {
        client_id: client_id ? client_id : existingOrder.client_id,
        date: date ? new Date(date).toISOString() : existingOrder.date,
        estimated_delivery_date: estimated_delivery_date ? new Date(estimated_delivery_date).toISOString() : existingOrder.estimated_delivery_date,
        status: status || existingOrder.status,
        responsable: responsable || existingOrder.responsable,
        notes: notes !== undefined ? (notes?.trim() || null) : existingOrder.notes,
        description: description !== undefined ? (description?.trim() || null) : existingOrder.description,
        edited_by: edited_by ? edited_by : existingOrder.edited_by,
      };

      if (items) {
        updatePayload.items = items.map(item => ({ product_id: item.product_id || null, template_id: item.template_id || null, quantity: Number(item.quantity), unit_price: Number(item.unit_price), is_delivered: item.is_delivered === true, is_paid: item.is_paid === true }));
      }

      const transaction = db.transaction(async () => {
        const updatedOrder = await orderRepository.update(id, updatePayload as OrderData);
        if (!updatedOrder) throw new Error('Error al actualizar orden');
        const result = updatedOrder.toPlainObject();
        if (!result.id || !result.client_id) { console.error('Orden actualizada inválida:', result); throw new Error('Datos de la orden actualizada inválidos'); }
        return result;
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      throw error;
    }
  }

  async deleteOrder(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden inválido');
      const existingOrder = await orderRepository.findById(id);
      if (!existingOrder) throw new Error('Orden no encontrada');
      if (existingOrder.isCompleted()) throw new Error('No se puede eliminar una orden completada. Considere cancelarla en su lugar.');
      const deleted = await orderRepository.delete(id);
      if (!deleted) throw new Error('Error al eliminar orden');
    } catch (error) {
      console.error('Error al eliminar orden:', error);
      throw error;
    }
  }

  async getOrderProducts(orderId: number) {
    try {
      if (!orderId || orderId <= 0) throw new Error('ID de orden inválido');
      return await orderRepository.getOrderProducts(orderId);
    } catch (error) {
      console.error('Error al obtener productos de orden:', error);
      throw error;
    }
  }

  async recalculateOrderTotal(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden inválido');
      const existingOrder = await orderRepository.findById(id);
      if (!existingOrder) throw new Error('Orden no encontrada');
      const newTotal = await orderRepository.recalculateTotal(id);
      return { orderId: id, newTotal, formattedTotal: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(newTotal) };
    } catch (error) {
      console.error('Error al recalcular total de orden:', error);
      throw error;
    }
  }
}

export default new OrderService();
