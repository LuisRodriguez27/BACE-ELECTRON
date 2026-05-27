const supplierOrderRepository = require('../repositories/supplierOrderRepository');
const supplierRepository = require('../repositories/supplierRepository');

class SupplierOrderService {
  async getAllSupplierOrders() {
    try {
      const orders = await supplierOrderRepository.findAll();
      return orders.map(o => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes de proveedor:', error);
      throw new Error('Error al obtener órdenes de proveedor');
    }
  }

  async getSupplierOrderById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden de proveedor inválido');
      }

      const order = await supplierOrderRepository.findById(parseInt(id));
      if (!order) {
        throw new Error('Orden de proveedor no encontrada');
      }

      return order.toPlainObject();
    } catch (error) {
      console.error('Error al obtener orden de proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersBySupplierId(supplierId) {
    try {
      if (!supplierId || isNaN(supplierId)) {
        throw new Error('ID de proveedor inválido');
      }

      const orders = await supplierOrderRepository.findBySupplierId(parseInt(supplierId));
      return orders.map(o => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersByOrderId(orderId) {
    try {
      if (!orderId || isNaN(orderId)) {
        throw new Error('ID de orden inválido');
      }

      const orders = await supplierOrderRepository.findByOrderId(parseInt(orderId));
      return orders.map(o => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por orden de cliente:', error);
      throw error;
    }
  }

  async createSupplierOrder({ supplier_id, order_id, status, notes, date, items }) {
    try {
      if (!supplier_id || isNaN(supplier_id)) {
        throw new Error('ID de proveedor es requerido e inválido');
      }

      const supplier = await supplierRepository.findById(parseInt(supplier_id));
      if (!supplier) {
        throw new Error('El proveedor especificado no existe o está inactivo');
      }

      if (!date) {
        throw new Error('La fecha de la orden de compra es requerida');
      }

      if (isNaN(new Date(date).getTime())) {
        throw new Error('Fecha de la orden de compra inválida');
      }

      if (items && !Array.isArray(items)) {
        throw new Error('Los artículos de la orden deben ser proporcionados como una lista (array)');
      }

      const order = await supplierOrderRepository.create({
        supplier_id: parseInt(supplier_id),
        order_id: order_id ? parseInt(order_id) : null,
        status: status ? status.trim() : null,
        notes: notes ? notes.trim() : null,
        date,
        items
      });

      return order.toPlainObject();
    } catch (error) {
      console.error('Error al crear orden de proveedor:', error);
      throw error;
    }
  }

  async updateSupplierOrder(id, data) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden de proveedor inválido');
      }

      const orderId = parseInt(id);

      const existing = await supplierOrderRepository.findById(orderId);
      if (!existing) {
        throw new Error('Orden de proveedor no encontrada');
      }

      const payload = {};

      if (data.supplier_id !== undefined) {
        if (!data.supplier_id || isNaN(data.supplier_id)) {
          throw new Error('ID de proveedor inválido');
        }
        const supplier = await supplierRepository.findById(parseInt(data.supplier_id));
        if (!supplier) {
          throw new Error('El proveedor especificado no existe o está inactivo');
        }
        payload.supplier_id = parseInt(data.supplier_id);
      }

      if (data.order_id !== undefined) {
        payload.order_id = data.order_id ? parseInt(data.order_id) : null;
      }

      if (data.status !== undefined) {
        payload.status = data.status ? data.status.trim() : null;
      }

      if (data.notes !== undefined) {
        payload.notes = data.notes ? data.notes.trim() : null;
      }

      if (data.date !== undefined) {
        if (!data.date || isNaN(new Date(data.date).getTime())) {
          throw new Error('Fecha de la orden de compra inválida');
        }
        payload.date = data.date;
      }

      if (data.items !== undefined) {
        if (data.items !== null && !Array.isArray(data.items)) {
          throw new Error('Los artículos de la orden deben ser proporcionados como una lista (array)');
        }
        payload.items = data.items;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error('No se proporcionaron campos para actualizar');
      }

      const updated = await supplierOrderRepository.update(orderId, payload);
      return updated.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar orden de proveedor:', error);
      throw error;
    }
  }

  async deleteSupplierOrder(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de orden de proveedor inválido');
      }

      const orderId = parseInt(id);

      const existing = await supplierOrderRepository.findById(orderId);
      if (!existing) {
        throw new Error('Orden de proveedor no encontrada');
      }

      const deleted = await supplierOrderRepository.delete(orderId);
      if (!deleted) {
        throw new Error('Error al eliminar orden de proveedor');
      }
    } catch (error) {
      console.error('Error al eliminar orden de proveedor:', error);
      throw error;
    }
  }

  async getPreviousItemsBySupplier(supplierId) {
    try {
      if (!supplierId || isNaN(supplierId)) {
        throw new Error('ID de proveedor inválido');
      }
      return await supplierOrderRepository.findPreviousItemsBySupplier(parseInt(supplierId));
    } catch (error) {
      console.error('Error al obtener artículos anteriores por proveedor:', error);
      throw error;
    }
  }
}

module.exports = new SupplierOrderService();
