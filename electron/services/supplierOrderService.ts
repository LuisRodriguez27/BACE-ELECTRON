// eslint-disable-next-line @typescript-eslint/no-require-imports
const supplierOrderRepository = require('../repositories/supplierOrderRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supplierRepository = require('../repositories/supplierRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRepository = require('../repositories/userRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const expensesRepository = require('../repositories/expensesRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cashSessionRepository = require('../repositories/cashSessionRepository');

const VALID_STATUSES = ['pendiente', 'pagado', 'cancelado'];

interface SupplierOrderData {
  supplier_id?: number | string;
  order_id?: number | string | null;
  user_id?: number | string | null;
  status?: string | null;
  notes?: string | null;
  date?: string;
  items?: unknown[] | null;
  total?: number | string | null;
  [key: string]: unknown;
}

class SupplierOrderService {
  async getAllSupplierOrders() {
    try {
      const orders = await supplierOrderRepository.findAll();
      return orders.map((o: { toPlainObject: () => unknown }) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes de proveedor:', error);
      throw new Error('Error al obtener órdenes de proveedor');
    }
  }

  async getSupplierOrderById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de orden de proveedor inválido');
      const order = await supplierOrderRepository.findById(parseInt(String(id)));
      if (!order) throw new Error('Orden de proveedor no encontrada');
      return order.toPlainObject();
    } catch (error) {
      console.error('Error al obtener orden de proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersBySupplierId(supplierId: number | string) {
    try {
      if (!supplierId || isNaN(Number(supplierId))) throw new Error('ID de proveedor inválido');
      const orders = await supplierOrderRepository.findBySupplierId(parseInt(String(supplierId)));
      return orders.map((o: { toPlainObject: () => unknown }) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por proveedor:', error);
      throw error;
    }
  }

  async getSupplierOrdersByOrderId(orderId: number | string) {
    try {
      if (!orderId || isNaN(Number(orderId))) throw new Error('ID de orden inválido');
      const orders = await supplierOrderRepository.findByOrderId(parseInt(String(orderId)));
      return orders.map((o: { toPlainObject: () => unknown }) => o.toPlainObject());
    } catch (error) {
      console.error('Error al obtener órdenes por orden de cliente:', error);
      throw error;
    }
  }

  async createSupplierOrder({ supplier_id, order_id, status, notes, date, items, user_id, total }: SupplierOrderData) {
    try {
      if (!supplier_id || isNaN(Number(supplier_id))) throw new Error('ID de proveedor es requerido e inválido');
      const supplier = await supplierRepository.findById(parseInt(String(supplier_id)));
      if (!supplier) throw new Error('El proveedor especificado no existe o está inactivo');

      if (user_id) {
        if (isNaN(Number(user_id))) throw new Error('ID de usuario/empleado inválido');
        const user = await userRepository.findById(parseInt(String(user_id)));
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

      const parsedTotal = total !== undefined && total !== null ? parseFloat(String(total)) : 0;
      let activeSession = null;
      if (parsedTotal > 0) {
        activeSession = await cashSessionRepository.getActive();
        if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar órdenes con total.');
      }

      const order = await supplierOrderRepository.create({ supplier_id: parseInt(String(supplier_id)), order_id: order_id ? parseInt(String(order_id)) : null, user_id: user_id ? parseInt(String(user_id)) : null, status: normalizedStatus, notes: notes ? String(notes).trim() : null, date, total: parsedTotal, items });

      if (parsedTotal > 0 && activeSession) {
        const supplierName = supplier ? (supplier.name as string) : 'Desconocido';
        await expensesRepository.create({ cash_session_id: activeSession.id, user_id: user_id ? parseInt(String(user_id)) : 1, amount: parsedTotal, description: `Pago Orden Proveedor #${order.id} - Proveedor: ${supplierName}`, date: date || new Date().toISOString(), supplier_order_id: order.id });
      }

      return order.toPlainObject();
    } catch (error) {
      console.error('Error al crear orden de proveedor:', error);
      throw error;
    }
  }

  async updateSupplierOrder(id: number | string, data: SupplierOrderData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de orden de proveedor inválido');
      const orderId = parseInt(String(id));
      const existing = await supplierOrderRepository.findById(orderId);
      if (!existing) throw new Error('Orden de proveedor no encontrada');

      const payload: Record<string, unknown> = {};

      if (data.supplier_id !== undefined) {
        if (!data.supplier_id || isNaN(Number(data.supplier_id))) throw new Error('ID de proveedor inválido');
        const supplier = await supplierRepository.findById(parseInt(String(data.supplier_id)));
        if (!supplier) throw new Error('El proveedor especificado no existe o está inactivo');
        payload.supplier_id = parseInt(String(data.supplier_id));
      }
      if (data.order_id !== undefined) payload.order_id = data.order_id ? parseInt(String(data.order_id)) : null;
      if (data.user_id !== undefined) {
        if (data.user_id !== null) {
          if (isNaN(Number(data.user_id))) throw new Error('ID de usuario/empleado inválido');
          const user = await userRepository.findById(parseInt(String(data.user_id)));
          if (!user) throw new Error('El usuario especificado no existe');
          payload.user_id = parseInt(String(data.user_id));
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
      if (data.total !== undefined) payload.total = data.total !== null ? parseFloat(String(data.total)) : 0;
      if (Object.keys(payload).length === 0) throw new Error('No se proporcionaron campos para actualizar');

      const newTotal = (payload.total as number | undefined) ?? (existing.total as number) ?? 0;
      const newDate = (payload.date as string | undefined) ?? (existing.date as string);
      const newUserId = (payload.user_id as number | undefined | null) ?? (existing.user_id as number | undefined);
      const newSupplierId = (payload.supplier_id as number | undefined) ?? (existing.supplier_id as number);

      const existingExpense = await expensesRepository.findBySupplierOrderId(orderId);

      if (newTotal > 0) {
        const supplier = await supplierRepository.findById(parseInt(String(newSupplierId)));
        const supplierName = supplier ? (supplier.name as string) : 'Desconocido';
        const description = `Pago Orden Proveedor #${orderId} - Proveedor: ${supplierName}`;
        if (existingExpense) {
          await expensesRepository.update(existingExpense.id, { amount: newTotal, description, date: newDate, edited_by: newUserId || 1 });
        } else {
          const activeSession = await cashSessionRepository.getActive();
          if (!activeSession) throw new Error('No hay una sesión de caja abierta. Abre la caja antes de registrar un total.');
          await expensesRepository.create({ cash_session_id: activeSession.id, user_id: newUserId || (existing.user_id as number) || 1, amount: newTotal, description, date: newDate || new Date().toISOString(), supplier_order_id: orderId });
        }
      } else {
        if (existingExpense) await expensesRepository.delete(existingExpense.id);
      }

      const updated = await supplierOrderRepository.update(orderId, payload);
      return updated.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar orden de proveedor:', error);
      throw error;
    }
  }

  async deleteSupplierOrder(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de orden de proveedor inválido');
      const orderId = parseInt(String(id));
      const existing = await supplierOrderRepository.findById(orderId);
      if (!existing) throw new Error('Orden de proveedor no encontrada');
      const deleted = await supplierOrderRepository.delete(orderId);
      if (!deleted) throw new Error('Error al eliminar orden de proveedor');
      const existingExpense = await expensesRepository.findBySupplierOrderId(orderId);
      if (existingExpense) await expensesRepository.delete(existingExpense.id);
    } catch (error) {
      console.error('Error al eliminar orden de proveedor:', error);
      throw error;
    }
  }

  async getPreviousItemsBySupplier(supplierId: number | string) {
    try {
      if (!supplierId || isNaN(Number(supplierId))) throw new Error('ID de proveedor inválido');
      return await supplierOrderRepository.findPreviousItemsBySupplier(parseInt(String(supplierId)));
    } catch (error) {
      console.error('Error al obtener artículos anteriores por proveedor:', error);
      throw error;
    }
  }
}

export default new SupplierOrderService();
