const db = require('../db');
const SupplierOrder = require('../domain/supplierOrder');

class SupplierOrderRepository {
  async findAll() {
    const rows = await db.getAll(`
      SELECT so.*, 
             s.name AS supplier_name, 
             s.phone AS supplier_phone, 
             o.total AS order_total
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      LEFT JOIN orders o ON so.order_id = o.id
      WHERE so.active = true
      ORDER BY so.date DESC
    `);
    return rows.map(r => new SupplierOrder(r));
  }

  async findById(id) {
    const row = await db.getOne(`
      SELECT so.*, 
             s.name AS supplier_name, 
             s.phone AS supplier_phone, 
             o.total AS order_total
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      LEFT JOIN orders o ON so.order_id = o.id
      WHERE so.id = $1 AND so.active = true
    `, [id]);
    if (!row) return null;
    return new SupplierOrder(row);
  }

  async findBySupplierId(supplierId) {
    const rows = await db.getAll(`
      SELECT so.*, 
             s.name AS supplier_name, 
             s.phone AS supplier_phone, 
             o.total AS order_total
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      LEFT JOIN orders o ON so.order_id = o.id
      WHERE so.supplier_id = $1 AND so.active = true
      ORDER BY so.date DESC
    `, [supplierId]);
    return rows.map(r => new SupplierOrder(r));
  }

  async findByOrderId(orderId) {
    const rows = await db.getAll(`
      SELECT so.*, 
             s.name AS supplier_name, 
             s.phone AS supplier_phone, 
             o.total AS order_total
      FROM supplier_orders so
      JOIN suppliers s ON so.supplier_id = s.id
      LEFT JOIN orders o ON so.order_id = o.id
      WHERE so.order_id = $1 AND so.active = true
      ORDER BY so.date DESC
    `, [orderId]);
    return rows.map(r => new SupplierOrder(r));
  }

  async create(orderData) {
    const result = await db.execute(`
      INSERT INTO supplier_orders (supplier_id, order_id, order_date, status, notes, date, active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
    `, [
      orderData.supplier_id,
      orderData.order_id || null,
      orderData.order_date,
      orderData.status || null,
      orderData.notes || null,
      orderData.date || new Date().toISOString()
    ]);

    return this.findById(result.lastInsertRowid);
  }

  async update(id, orderData) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (orderData.supplier_id !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(orderData.supplier_id); }
    if (orderData.order_id !== undefined) { fields.push(`order_id = $${idx++}`); values.push(orderData.order_id); }
    if (orderData.order_date !== undefined) { fields.push(`order_date = $${idx++}`); values.push(orderData.order_date); }
    if (orderData.status !== undefined) { fields.push(`status = $${idx++}`); values.push(orderData.status); }
    if (orderData.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(orderData.notes); }
    if (orderData.date !== undefined) { fields.push(`date = $${idx++}`); values.push(orderData.date); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await db.execute(`
      UPDATE supplier_orders
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND active = true
    `, values);

    return this.findById(id);
  }

  async delete(id) {
    const result = await db.execute('UPDATE supplier_orders SET active = false WHERE id = $1', [id]);
    return result.changes > 0;
  }
}

module.exports = new SupplierOrderRepository();
