import supplierOrderRepository from '../repositories/supplierOrderRepository';
import supplierRepository from '../repositories/supplierRepository';
import userRepository from '../repositories/userRepository';
import expensesRepository from '../repositories/expensesRepository';
import cashSessionRepository from '../repositories/cashSessionRepository';
import type { SupplierOrderData } from '../types/supplierOrder';
import db from '../db';

const VALID_STATUSES = ['pendiente', 'pagado', 'cancelado'];

class SupplierOrderService {
  async getAllSupplierOrders() {
    try {
      const orders = await supplierOrderRepository.findAll();
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes de proveedor:', error);
      throw new Error('Error al obtener órdenes de proveedor');
    }
  }

  async getSupplierOrderById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden de proveedor inválido');
      const order = await supplierOrderRepository.findById(id);
      if (!order) throw new Error('Orden de proveedor no encontrada');
      return order.toPlainObject();
    } catch (error) {
      console.error('Error al obtener orden de proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersBySupplierId(supplierId: number) {
    try {
      if (!supplierId || supplierId <= 0) throw new Error('ID de proveedor inválido');
      const orders = await supplierOrderRepository.findBySupplierId(supplierId);
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersByOrderId(orderId: number) {
    try {
      if (!orderId || orderId <= 0) throw new Error('ID de orden inválido');
      const orders = await supplierOrderRepository.findByOrderId(orderId);
      return orders.map((o) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por orden de cliente:', error);
      throw error;
    }
  }

  async createSupplierOrder({ supplier_id, order_id, status, notes, date, items, user_id, total }: SupplierOrderData) {
    try {
      if (!supplier_id || supplier_id <= 0) throw new Error('ID de proveedor es requerido e inválido');
      const supplier = await supplierRepository.findById(supplier_id);
      if (!supplier) throw new Error('El proveedor especificado no existe o está inactivo');

      if (user_id) {
        if (user_id <= 0) throw new Error('ID de usuario/empleado inválido');
        const user = await userRepository.findById(user_id);
        if (!user) throw new Error('El usuario especificado no existe');
      }

      if (!date) throw new Error('La fecha de la orden de compra es requerida');
      if (isNaN(new Date(date).getTime())) throw new Error('Fecha de la orden de compra inválida');
      if (items && !Array.isArray(items)) throw new Error('Los artículos de la orden deben ser proporcionados como una lista (array)');

      let normalizedStatus = 'pendiente';
      if (status) {
        normalizedStatus = status.trim().toLowerCase();
        if (!VALID_STATUSES.includes(normalizedStatus)) throw new Error(`Estado inválido. Los estados permitidos son: ${VALID_STATUSES.join(', ')}`);
      }

      const parsedTotal = total ?? 0;
      let activeSession = null;
      if (parsedTotal > 0) {
        activeSession = await cashSessionRepository.getActive();
        if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar órdenes con total.');
      }

      const transaction = db.transaction(async () => {
        const order = await supplierOrderRepository.create({
          supplier_id,
          order_id: order_id || null,
          user_id: user_id || null,
          status: normalizedStatus,
          notes: notes ? String(notes).trim() : null,
          date,
          total: parsedTotal,
          items: items ?? []
        });
        if (!order) throw new Error('Error al crear orden de proveedor');

        if (parsedTotal > 0 && activeSession) {
          const supplierName = supplier ? (supplier.name as string) : 'Desconocido';
          await expensesRepository.create({
            cash_session_id: activeSession.id as number,
            user_id: user_id || 1,
            amount: parsedTotal,
            description: `Pago Orden Proveedor #${order.id} - Proveedor: ${supplierName}`,
            date: date || new Date().toISOString(),
            supplier_order_id: order.id
          });
        }

        return order.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear orden de proveedor:', error);
      throw error;
    }
  }

  async updateSupplierOrder(id: number, data: SupplierOrderData) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden de proveedor inválido');
      const existing = await supplierOrderRepository.findById(id);
      if (!existing) throw new Error('Orden de proveedor no encontrada');

      const payload: SupplierOrderData = {};

      if (data.supplier_id !== undefined) {
        if (!data.supplier_id || data.supplier_id <= 0) throw new Error('ID de proveedor inválido');
        const supplier = await supplierRepository.findById(data.supplier_id);
        if (!supplier) throw new Error('El proveedor especificado no existe o está inactivo');
        payload.supplier_id = data.supplier_id;
      }
      if (data.order_id !== undefined) payload.order_id = data.order_id || null;
      if (data.user_id !== undefined) {
        if (data.user_id !== null) {
          if (data.user_id <= 0) throw new Error('ID de usuario/empleado inválido');
          const user = await userRepository.findById(data.user_id);
          if (!user) throw new Error('El usuario especificado no existe');
          payload.user_id = data.user_id;
        } else { payload.user_id = null; }
      }
      if (data.status !== undefined) {
        if (data.status !== null) {
          const normalizedStatus = data.status.trim().toLowerCase();
          if (!VALID_STATUSES.includes(normalizedStatus)) throw new Error(`Estado inválido. Los estados permitidos son: ${VALID_STATUSES.join(', ')}`);
          payload.status = normalizedStatus;
        } else { payload.status = null; }
      }
      if (data.notes !== undefined) payload.notes = data.notes ? String(data.notes).trim() : null;
      if (data.date !== undefined) {
        if (!data.date || isNaN(new Date(String(data.date)).getTime())) throw new Error('Fecha de la orden de compra inválida');
        payload.date = data.date;
      }
      if (data.items !== undefined) {
        if (data.items !== null && !Array.isArray(data.items)) throw new Error('Los artículos de la orden deben ser proporcionados como una lista (array)');
        payload.items = data.items;
      }
      if (data.total !== undefined) payload.total = data.total !== null ? data.total : 0;
      if (Object.keys(payload).length === 0) throw new Error('No se proporcionaron campos para actualizar');

      const newTotal = payload.total ?? existing.total ?? 0;
      const newDate = payload.date ?? existing.date;
      const newUserId = payload.user_id ?? existing.user_id;
      const newSupplierId = payload.supplier_id ?? existing.supplier_id;

      const transaction = db.transaction(async () => {
        const existingExpense = await expensesRepository.findBySupplierOrderId(id);

        if (newTotal > 0) {
          const supplier = await supplierRepository.findById(newSupplierId);
          const supplierName = supplier ? (supplier.name as string) : 'Desconocido';
          const description = `Pago Orden Proveedor #${id} - Proveedor: ${supplierName}`;
          if (existingExpense) {
            await expensesRepository.update(existingExpense.id, { amount: newTotal, description, date: newDate, edited_by: newUserId || 1 });
          } else {
            const activeSession = await cashSessionRepository.getActive();
            if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar un total.');
            await expensesRepository.create({ cash_session_id: activeSession.id, user_id: newUserId || (existing.user_id as number) || 1, amount: newTotal, description, date: newDate || new Date().toISOString(), supplier_order_id: id });
          }
        } else {
          if (existingExpense) await expensesRepository.delete(existingExpense.id);
        }

        const updated = await supplierOrderRepository.update(id, payload);
        if (!updated) throw new Error('Error al obtener la orden actualizada');
        return updated.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar orden de proveedor:', error);
      throw error;
    }
  }

  async deleteSupplierOrder(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de orden de proveedor inválido');
      const existing = await supplierOrderRepository.findById(id);
      if (!existing) throw new Error('Orden de proveedor no encontrada');

      const transaction = db.transaction(async () => {
        const deleted = await supplierOrderRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar orden de proveedor');
        const existingExpense = await expensesRepository.findBySupplierOrderId(id);
        if (existingExpense) await expensesRepository.delete(existingExpense.id);
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar orden de proveedor:', error);
      throw error;
    }
  }

  async getPreviousItemsBySupplier(supplierId: number) {
    try {
      if (!supplierId || supplierId <= 0) throw new Error('ID de proveedor inválido');
      return await supplierOrderRepository.findPreviousItemsBySupplier(supplierId);
    } catch (error) {
      console.error('Error al obtener artículos anteriores por proveedor:', error);
      throw error;
    }
  }
}

export default new SupplierOrderService();
