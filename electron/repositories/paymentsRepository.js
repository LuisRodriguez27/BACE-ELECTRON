const db = require('../db');
const Payment = require('../domain/payments');

class PaymentsRepository {
  async findAll() {
    const rows = await db.getAll(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total,
        c.name as o_client_name,
        o.description as o_description,
        o.notes as o_notes
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      ORDER BY p.date DESC
    `);

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total,
            client_name: row.o_client_name,
            description: row.o_description,
            notes: row.o_notes
          }
        : null
    }));
  }

  async findByOrderId(orderId) {
    const rows = await db.getAll(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total,
        c.name as o_client_name,
        o.description as o_description,
        o.notes as o_notes
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE p.order_id = $1
      ORDER BY p.date DESC
    `, [orderId]);

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total,
            client_name: row.o_client_name,
            description: row.o_description,
            notes: row.o_notes
          }
        : null
    }));
  }

  async findById(id) {
    const row = await db.getOne(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total,
        c.name as o_client_name,
        o.description as o_description,
        o.notes as o_notes
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (!row) return null;

    return new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total,
            client_name: row.o_client_name,
            description: row.o_description,
            notes: row.o_notes
          }
        : null
    });
  }

  async create({ order_id, amount, date, descripcion, info }) {
    const result = await db.execute(
      'INSERT INTO payments (order_id, amount, date, descripcion, info) VALUES ($1, $2, $3, $4, $5)',
      [order_id || null, amount, date, descripcion, info || null]
    );

    return await this.findById(result.lastInsertRowid);
  }

  async update(id, { amount, descripcion }) {
    const result = await db.execute(
      'UPDATE payments SET amount = $1, descripcion = $2 WHERE id = $3',
      [amount, descripcion, id]
    );

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('DELETE FROM payments WHERE id = $1', [id]);

    return result.changes > 0;
  }

  async findByClientId(clientId) {
    const rows = await db.getAll(`
      SELECT 
        p.*,
        o.id as o_id, 
        o.client_id as o_client_id, 
        o.status as o_status, 
        o.total as o_total,
        c.name as o_client_name,
        o.description as o_description,
        o.notes as o_notes
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.client_id = $1
      ORDER BY p.date DESC
    `, [clientId]);

    return rows.map(row => new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: row.amount,
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      order: row.o_id
        ? {
            id: row.o_id,
            client_id: row.o_client_id,
            status: row.o_status,
            total: row.o_total,
            client_name: row.o_client_name,
            description: row.o_description,
            notes: row.o_notes
          }
        : null
    }));
  }

  async getTotalPaymentsByOrderId(orderId) {
    const result = await db.getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments 
      WHERE order_id = $1
    `, [orderId]);

    return result ? parseFloat(result.total) || 0 : 0;
  }
}

module.exports = new PaymentsRepository();
