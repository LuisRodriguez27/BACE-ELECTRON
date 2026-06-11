const supplierOrderRepository = require('../repositories/supplierOrderRepository');
const supplierRepository = require('../repositories/supplierRepository');
const userRepository = require('../repositories/userRepository');
const expensesRepository = require('../repositories/expensesRepository');
const cashSessionRepository = require('../repositories/cashSessionRepository');

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

  async createSupplierOrder({ supplier_id, order_id, status, notes, date, items, user_id, total }) {
    try {
      if (!supplier_id || isNaN(supplier_id)) {
        throw new Error('ID de proveedor es requerido e inválido');
      }

      const supplier = await supplierRepository.findById(parseInt(supplier_id));
      if (!supplier) {
        throw new Error('El proveedor especificado no existe o está inactivo');
      }

      if (user_id) {
        if (isNaN(user_id)) {
          throw new Error('ID de usuario/empleado inválido');
        }
        const user = await userRepository.findById(parseInt(user_id));
        if (!user) {
          throw new Error('El usuario especificado no existe');
        }
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

      // Validar estado progresivo
      const VALID_STATUSES = ['pendiente', 'pagado', 'entregado', 'cancelado'];
      let normalizedStatus = 'pendiente';
      if (status) {
        normalizedStatus = status.trim().toLowerCase();
        if (!VALID_STATUSES.includes(normalizedStatus)) {
          throw new Error(`Estado inválido. Los estados permitidos son: ${VALID_STATUSES.join(', ')}`);
        }
      }

      // Verificar sesión de caja activa si total > 0
      const parsedTotal = total !== undefined && total !== null ? parseFloat(total) : 0;
      let activeSession = null;
      if (parsedTotal > 0) {
        activeSession = await cashSessionRepository.getActive();
        if (!activeSession) {
          throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar órdenes con total.');
        }
      }

      const order = await supplierOrderRepository.create({
        supplier_id: parseInt(supplier_id),
        order_id: order_id ? parseInt(order_id) : null,
        user_id: user_id ? parseInt(user_id) : null,
        status: normalizedStatus,
        notes: notes ? notes.trim() : null,
        date,
        total: parsedTotal,
        items
      });

      // Crear Gasto relacionado si total > 0
      if (parsedTotal > 0 && activeSession) {
        const supplierName = supplier ? supplier.name : 'Desconocido';
        await expensesRepository.create({
          cash_session_id: activeSession.id,
          user_id: user_id ? parseInt(user_id) : 1, // fallback al admin (id 1)
          amount: parsedTotal,
          description: `Pago Orden Proveedor #${order.id} - Proveedor: ${supplierName}`,
          date: date || new Date().toISOString(),
          supplier_order_id: order.id
        });
      }

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

      if (data.user_id !== undefined) {
        if (data.user_id !== null) {
          if (isNaN(data.user_id)) {
            throw new Error('ID de usuario/empleado inválido');
          }
          const user = await userRepository.findById(parseInt(data.user_id));
          if (!user) {
            throw new Error('El usuario especificado no existe');
          }
          payload.user_id = parseInt(data.user_id);
        } else {
          payload.user_id = null;
        }
      }

      // Validar estado progresivo
      const VALID_STATUSES = ['pendiente', 'pagado', 'entregado', 'cancelado'];
      if (data.status !== undefined) {
        if (data.status !== null) {
          const normalizedStatus = data.status.trim().toLowerCase();
          if (!VALID_STATUSES.includes(normalizedStatus)) {
            throw new Error(`Estado inválido. Los estados permitidos son: ${VALID_STATUSES.join(', ')}`);
          }
          payload.status = normalizedStatus;
        } else {
          payload.status = null;
        }
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

      if (data.total !== undefined) {
        payload.total = data.total !== null ? parseFloat(data.total) : 0;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error('No se proporcionaron campos para actualizar');
      }

      // Obtener el total final y los campos de gasto relacionados
      const newTotal = payload.total !== undefined ? payload.total : (existing.total || 0);
      const newDate = payload.date !== undefined ? payload.date : existing.date;
      const newUserId = payload.user_id !== undefined ? payload.user_id : existing.user_id;
      const newSupplierId = payload.supplier_id !== undefined ? payload.supplier_id : existing.supplier_id;

      // Manejar el ciclo de vida del Gasto
      const existingExpense = await expensesRepository.findBySupplierOrderId(orderId);

      if (newTotal > 0) {
        const supplier = await supplierRepository.findById(parseInt(newSupplierId));
        const supplierName = supplier ? supplier.name : 'Desconocido';
        const description = `Pago Orden Proveedor #${orderId} - Proveedor: ${supplierName}`;

        if (existingExpense) {
          // Actualizar gasto existente
          await expensesRepository.update(existingExpense.id, {
            amount: newTotal,
            description,
            date: newDate,
            edited_by: newUserId || 1
          });
        } else {
          // Crear nuevo gasto
          const activeSession = await cashSessionRepository.getActive();
          if (!activeSession) {
            throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar un total.');
          }
          await expensesRepository.create({
            cash_session_id: activeSession.id,
            user_id: newUserId || existing.user_id || 1,
            amount: newTotal,
            description,
            date: newDate || new Date().toISOString(),
            supplier_order_id: orderId
          });
        }
      } else {
        // Si total <= 0, eliminar gasto asociado si existe
        if (existingExpense) {
          await expensesRepository.delete(existingExpense.id);
        }
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

      // Eliminar Gasto relacionado si existe
      const existingExpense = await expensesRepository.findBySupplierOrderId(orderId);
      if (existingExpense) {
        await expensesRepository.delete(existingExpense.id);
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
