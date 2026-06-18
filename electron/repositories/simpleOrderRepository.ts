import db from '../db';
import SimpleOrder from '../domain/simpleOrder';
import cashSessionRepository from './cashSessionRepository';
import type { SimpleOrderRow, SimpleOrderPaymentRow } from '../types/simpleOrder';

class SimpleOrderRepository {
  async getAll() {
    const rows = await db.getAll<SimpleOrderRow>(`SELECT o.*, u.username as user_username FROM simple_orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.active = true ORDER BY o.date DESC`);
    const ordersWithPayments = [];
    for (const row of rows) {
      const payments = await this.getPayments(row.id as number);
      ordersWithPayments.push(new SimpleOrder({ ...row, payments }));
    }
    return ordersWithPayments;
  }

  async getById(id: number) {
    const row = await db.getOne<SimpleOrderRow>(`SELECT o.*, u.username as user_username FROM simple_orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = $1`, [id]);
    if (!row) return null;
    const payments = await this.getPayments(id);
    return new SimpleOrder({ ...row, payments });
  }

  async create(orderData: { user_id: number; date: string; concept: string; total: number; active?: boolean; client_name?: string | null; client_phone?: string | null }): Promise<number> {
    const { user_id, date, concept, total, active = true, client_name, client_phone } = orderData;
    const result = await db.execute(`INSERT INTO simple_orders (user_id, date, concept, total, active, client_name, client_phone) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [user_id, date, concept, total, active, client_name, client_phone]);
    return result.lastInsertRowid!;
  }

  async update(id: number, orderData: { user_id: number; date: string; concept: string; total: number; active?: boolean; client_name?: string | null; client_phone?: string | null }): Promise<boolean> {
    const { user_id, date, concept, total, active = true, client_name, client_phone } = orderData;
    const result = await db.execute(`UPDATE simple_orders SET user_id = $1, date = $2, concept = $3, total = $4, active = $5, client_name = $6, client_phone = $7 WHERE id = $8`, [user_id, date, concept, total, active, client_name, client_phone, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE simple_orders SET active = false WHERE id = $1`, [id]);
    return (result.changes ?? 0) > 0;
  }

  async getPayments(orderId: number): Promise<SimpleOrderPaymentRow[]> {
    return await db.getAll<SimpleOrderPaymentRow>(`SELECT p.*, u.username as user_username FROM simple_order_payments p LEFT JOIN users u ON p.user_id = u.id WHERE p.simple_order_id = $1 ORDER BY p.date ASC`, [orderId]);
  }

  async getPaymentById(id: number): Promise<SimpleOrderPaymentRow | null> {
    return await db.getOne<SimpleOrderPaymentRow>(`SELECT p.*, u.username as user_username FROM simple_order_payments p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = $1`, [id]);
  }

  async addPayment(paymentData: { simple_order_id: number; user_id: number; amount: number; date: string; descripcion?: string | null }): Promise<number> {
    const { simple_order_id, user_id, amount, date, descripcion } = paymentData;
    const activeSession = await cashSessionRepository.getActive();
    const cash_session_id = activeSession?.id ?? null;
    const result = await db.execute(`INSERT INTO simple_order_payments (simple_order_id, user_id, cash_session_id, amount, date, descripcion) VALUES ($1, $2, $3, $4, $5, $6)`, [simple_order_id, user_id, cash_session_id, amount, date, descripcion || null]);
    return result.lastInsertRowid!;
  }

  async updatePayment(id: number, paymentData: { amount: number; date: string; descripcion?: string | null }): Promise<boolean> {
    const result = await db.execute(`UPDATE simple_order_payments SET amount = $1, date = $2, descripcion = $3 WHERE id = $4`, [paymentData.amount, paymentData.date, paymentData.descripcion || null, id]);
    return (result.changes ?? 0) > 0;
  }

  async deletePayment(id: number): Promise<boolean> {
    const result = await db.execute(`DELETE FROM simple_order_payments WHERE id = $1`, [id]);
    return (result.changes ?? 0) > 0;
  }

  async findPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    let searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `AND (CAST(o.id AS TEXT) ILIKE $${paramIndex} OR o.concept ILIKE $${paramIndex} OR o.client_name ILIKE $${paramIndex} OR o.client_phone ILIKE $${paramIndex})`;
      searchParams = [term];
      paramIndex = 2;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM simple_orders o WHERE o.active = true ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10) || 0;
    const rows = await db.getAll<SimpleOrderRow>(`SELECT o.*, u.username as user_username FROM simple_orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.active = true ${searchCondition} ORDER BY o.date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    const ordersWithPayments = [];
    for (const row of rows) {
      const payments = await this.getPayments(row.id as number);
      ordersWithPayments.push(new SimpleOrder({ ...row, payments }));
    }

    const statsResult = await db.getOne<{ total_count: string; total_amount: string; total_paid: string; total_pending: string }>(`
      WITH order_payments AS (SELECT simple_order_id, COALESCE(SUM(amount), 0) as total_paid FROM simple_order_payments GROUP BY simple_order_id)
      SELECT COUNT(*) as total_count, COALESCE(SUM(total), 0) as total_amount, COALESCE(SUM(COALESCE(p.total_paid, 0)), 0) as total_paid, COALESCE(SUM(GREATEST(0, total - COALESCE(p.total_paid, 0))), 0) as total_pending
      FROM simple_orders o LEFT JOIN order_payments p ON o.id = p.simple_order_id WHERE o.active = true
    `);

    return {
      data: ordersWithPayments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
      stats: { totalCount: parseInt(statsResult!.total_count, 10) || 0, totalRevenues: parseFloat(statsResult!.total_paid) || 0, totalPending: parseFloat(statsResult!.total_pending) || 0 }
    };
  }
}

export default new SimpleOrderRepository();
