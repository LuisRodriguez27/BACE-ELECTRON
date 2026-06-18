import db from '../db';
import SupplierOrder from '../domain/supplierOrder';
import SupplierOrderItem from '../domain/supplierOrderItem';
import type { SupplierOrderRow, SupplierOrderItemRow, SupplierOrderData } from '../types/supplierOrder';

const BASE_SELECT = `
  SELECT so.*, s.name AS supplier_name, s.phone AS supplier_phone, o.total AS order_total, u.username AS username
  FROM supplier_orders so
  JOIN suppliers s ON so.supplier_id = s.id
  LEFT JOIN orders o ON so.order_id = o.id
  LEFT JOIN users u ON so.user_id = u.id
`;

class SupplierOrderRepository {
  async getOrderItems(supplierOrderId: number) {
    const rows = await db.getAll<SupplierOrderItemRow>(`SELECT * FROM supplier_order_items WHERE supplier_order_id = $1 AND active = true ORDER BY id ASC`, [supplierOrderId]);
    return rows.map((r) => new SupplierOrderItem(r));
  }

  async addItemsToOrder(supplierOrderId: number, items: Record<string, any>[]): Promise<void> {
    for (const item of items) {
      const itemDataJson = typeof item === 'string' ? item : JSON.stringify(item);
      await db.execute(`INSERT INTO supplier_order_items (supplier_order_id, item_data, active) VALUES ($1, $2, true)`, [supplierOrderId, itemDataJson]);
    }
  }

  async findAll() {
    const rows = await db.getAll<SupplierOrderRow>(`${BASE_SELECT} WHERE so.active = true ORDER BY so.date DESC`);
    return await Promise.all(rows.map(async (r) => {
      const items = await this.getOrderItems(r.id);
      return new SupplierOrder({ ...r, supplierOrderItems: items });
    }));
  }

  async findById(id: number) {
    const row = await db.getOne<SupplierOrderRow>(`${BASE_SELECT} WHERE so.id = $1 AND so.active = true`, [id]);
    if (!row) return null;
    const items = await this.getOrderItems(id);
    return new SupplierOrder({ ...row, supplierOrderItems: items });
  }

  async findBySupplierId(supplierId: number) {
    const rows = await db.getAll<SupplierOrderRow>(`${BASE_SELECT} WHERE so.supplier_id = $1 AND so.active = true ORDER BY so.date DESC`, [supplierId]);
    return await Promise.all(rows.map(async (r) => {
      const items = await this.getOrderItems(r.id);
      return new SupplierOrder({ ...r, supplierOrderItems: items });
    }));
  }

  async findByOrderId(orderId: number) {
    const rows = await db.getAll<SupplierOrderRow>(`${BASE_SELECT} WHERE so.order_id = $1 AND so.active = true ORDER BY so.date DESC`, [orderId]);
    return await Promise.all(rows.map(async (r) => {
      const items = await this.getOrderItems(r.id);
      return new SupplierOrder({ ...r, supplierOrderItems: items });
    }));
  }

  async create(orderData: SupplierOrderData) {
    const result = await db.execute(`INSERT INTO supplier_orders (supplier_id, order_id, user_id, status, notes, date, total, active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`, [orderData.supplier_id!, orderData.order_id || null, orderData.user_id || null, orderData.status || null, orderData.notes || null, orderData.date || new Date().toISOString(), orderData.total || 0]);
    const supplierOrderId = result.lastInsertRowid!;
    if (orderData.items && Array.isArray(orderData.items)) await this.addItemsToOrder(supplierOrderId, orderData.items);
    return this.findById(supplierOrderId);
  }

  async update(id: number, orderData: SupplierOrderData) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;
    if (orderData.supplier_id !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(orderData.supplier_id); }
    if (orderData.order_id !== undefined) { fields.push(`order_id = $${idx++}`); values.push(orderData.order_id); }
    if (orderData.user_id !== undefined) { fields.push(`user_id = $${idx++}`); values.push(orderData.user_id); }
    if (orderData.status !== undefined) { fields.push(`status = $${idx++}`); values.push(orderData.status); }
    if (orderData.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(orderData.notes); }
    if (orderData.date !== undefined) { fields.push(`date = $${idx++}`); values.push(orderData.date); }
    if (orderData.total !== undefined) { fields.push(`total = $${idx++}`); values.push(orderData.total); }
    if (fields.length > 0) { values.push(id); await db.execute(`UPDATE supplier_orders SET ${fields.join(', ')} WHERE id = $${idx} AND active = true`, values); }
    if (orderData.items && Array.isArray(orderData.items)) { await db.execute('DELETE FROM supplier_order_items WHERE supplier_order_id = $1', [id]); await this.addItemsToOrder(id, orderData.items); }
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE supplier_orders SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async findPreviousItemsBySupplier(supplierId: number) {
    const rows = await db.getAll<{ item_data: string | Record<string, any> }>(`SELECT soi.item_data FROM supplier_order_items soi JOIN supplier_orders so ON soi.supplier_order_id = so.id WHERE so.supplier_id = $1 AND soi.active = true AND so.active = true ORDER BY soi.id DESC`, [supplierId]);
    return rows.map((r) => typeof r.item_data === 'string' ? JSON.parse(r.item_data) : r.item_data);
  }
}

export default new SupplierOrderRepository();
