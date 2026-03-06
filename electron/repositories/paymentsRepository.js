const db = require('../db');
const Payment = require('../domain/payments');

class PaymentsRepository {
  async findAll() {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      ORDER BY p.date DESC
    `);

    const rows = await stmt.all();

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total
          }
        : null
    }));
  }

  async findByOrderId(orderId) {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.order_id = ?
      ORDER BY p.date DESC
    `);

    const rows = await stmt.all(orderId);

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total
          }
        : null
    }));
  }

  async findById(id) {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?
    `);

    const row = await stmt.get(id);

    if (!row) return null;

    return new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total
          }
        : null
    });
  }

  async create({ order_id, amount, date, descripcion }) {
    const stmt = db.prepare(
      'INSERT INTO payments (order_id, amount, date, descripcion) VALUES (?, ?, ?, ?)'
    );
    const result = await stmt.run(order_id, amount, date, descripcion);

    return await this.findById(result.lastInsertRowid);
  }

  async update(id, { amount, descripcion }) {
    const stmt = db.prepare(
      'UPDATE payments SET amount = ?, descripcion = ? WHERE id = ?'
    );
    const result = await stmt.run(amount, descripcion, id);

    return result.changes > 0;
  }

  async delete(id) {
    const stmt = db.prepare('DELETE FROM payments WHERE id = ?');
    const result = await stmt.run(id);

    return result.changes > 0;
  }

  async findByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE o.client_id = ?
      ORDER BY p.date DESC
    `);

    const rows = await stmt.all(clientId);

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total
          }
        : null
    }));
  }

  async getTotalPaymentsByOrderId(orderId) {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE order_id = ?
    `);

    const result = await stmt.get(orderId);
    return result ? parseFloat(result.total) || 0 : 0;
  }
}

module.exports = new PaymentsRepository();
