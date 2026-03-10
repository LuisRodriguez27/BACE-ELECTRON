const db = require('../db');
const SimpleOrder = require('../domain/simpleOrder');

class SimpleOrderRepository {

  _normalizeDate(dateInput) {
    if (!dateInput) return new Date().toISOString().replace('Z', '').replace('T', ' ');
    try {
      return new Date(dateInput).toISOString().replace('Z', '').replace('T', ' ');
    } catch (e) {
      return new Date().toISOString().replace('Z', '').replace('T', ' ');
    }
  }
  async getAll() {
    const rows = await db.prepare(`
      SELECT o.*, u.username as user_username
      FROM simple_orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.active = 1
      ORDER BY o.date DESC
    `).all();

    const ordersWithPayments = [];
    for (const row of rows) {
      const payments = await this.getPayments(row.id);
      ordersWithPayments.push(new SimpleOrder({ ...row, payments }));
    }

    return ordersWithPayments;
  }

  async getById(id) {
    const row = await db.prepare(`
      SELECT o.*, u.username as user_username
      FROM simple_orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `).get(id);

    if (!row) return null;

    // Get payments
    const payments = await this.getPayments(id);
    return new SimpleOrder({ ...row, payments });
  }

  async create(orderData) {
    const { user_id, date, concept, total, active = 1, client_name } = orderData;
    const result = await db.prepare(`
      INSERT INTO simple_orders (user_id, date, concept, total, active, client_name)
      VALUES ($1, $2, $3, $4, $5, $6)
    `).run(user_id, this._normalizeDate(date), concept, total, active, client_name);

    return result.lastInsertRowid;
  }

  async update(id, orderData) {
    const { user_id, date, concept, total, active = 1, client_name } = orderData;
    const result = await db.prepare(`
      UPDATE simple_orders 
      SET user_id = $1, date = $2, concept = $3, total = $4, active = $5, client_name = $6
      WHERE id = $7
    `).run(user_id, this._normalizeDate(date), concept, total, active, client_name, id);

    return result.changes > 0;
  }

  async delete(id) {
    // Soft delete
    const result = await db.prepare(`
      UPDATE simple_orders SET active = 0 WHERE id = $1
    `).run(id);
    return result.changes > 0;
  }

  // Payments logic

  async getPayments(orderId) {
    return await db.prepare(`
      SELECT p.*, u.username as user_username
      FROM simple_order_payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.simple_order_id = $1
      ORDER BY p.date ASC
    `).all(orderId);
  }

  async getPaymentById(id) {
    return await db.prepare(`
      SELECT p.*, u.username as user_username
      FROM simple_order_payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `).get(id);
  }

  async addPayment(paymentData) {
    const { simple_order_id, user_id, amount, date, descripcion } = paymentData;
    const result = await db.prepare(`
      INSERT INTO simple_order_payments (simple_order_id, user_id, amount, date, descripcion)
      VALUES ($1, $2, $3, $4, $5)
    `).run(simple_order_id, user_id, amount, this._normalizeDate(date), descripcion || null);

    return result.lastInsertRowid;
  }

  async updatePayment(id, paymentData) {
    const { amount, date, descripcion } = paymentData;
    const result = await db.prepare(`
      UPDATE simple_order_payments
      SET amount = $1, date = $2, descripcion = $3
      WHERE id = $4
    `).run(amount, this._normalizeDate(date), descripcion || null, id);
    return result.changes > 0;
  }

  async deletePayment(id) {
    const result = await db.prepare(`
      DELETE FROM simple_order_payments WHERE id = $1
    `).run(id);
    return result.changes > 0;
  }
}

module.exports = new SimpleOrderRepository();
