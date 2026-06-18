import db from '../db';
import Expenses from '../domain/expenses';
import type { ExpensesRow } from '../types/expense';

class ExpensesRepository {
  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM expenses WHERE active = TRUE`),
      db.getAll<ExpensesRow>(`SELECT e.*, u.username AS user_username, ue.username AS edited_by_username FROM expenses e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN users ue ON e.edited_by = ue.id WHERE e.active = TRUE ORDER BY e.date DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    ]);
    const total = parseInt(countRow!.total, 10);
    return {
      data: rows.map((r) => new Expenses(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async getByCashSession(cashSessionId: number) {
    const rows = await db.getAll<ExpensesRow>(`SELECT e.*, u.username AS user_username, ue.username AS edited_by_username FROM expenses e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN users ue ON e.edited_by = ue.id WHERE e.cash_session_id = $1 AND e.active = TRUE ORDER BY e.date ASC`, [cashSessionId]);
    return rows.map((r) => new Expenses(r));
  }

  async getById(id: number) {
    const row = await db.getOne<ExpensesRow>(`SELECT e.*, u.username AS user_username, ue.username AS edited_by_username FROM expenses e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN users ue ON e.edited_by = ue.id WHERE e.id = $1`, [id]);
    if (!row) return null;
    return new Expenses(row);
  }

  async create({ cash_session_id, user_id, amount, description, date, supplier_order_id }: { cash_session_id: number; user_id: number; amount: number | string; description: string; date: string; supplier_order_id?: number | null }) {
    const row = await db.getOne<{ id: number }>(`INSERT INTO expenses (cash_session_id, user_id, amount, description, date, supplier_order_id, active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`, [cash_session_id, user_id, parseFloat(String(amount)), description.trim(), date, supplier_order_id || null]);
    return this.getById(row!.id);
  }

  async update(id: number, { amount, description, date, edited_by, supplier_order_id }: { amount?: number; description?: string; date?: string; edited_by?: number; supplier_order_id?: number | null }) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;
    if (amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(parseFloat(String(amount))); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description.trim()); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
    if (edited_by !== undefined) { fields.push(`edited_by = $${idx++}`); values.push(edited_by); }
    if (supplier_order_id !== undefined) { fields.push(`supplier_order_id = $${idx++}`); values.push(supplier_order_id); }
    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await db.execute(`UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`, values);
    return this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE expenses SET active = FALSE WHERE id = $1 AND active = TRUE`, [id]);
    return (result.changes ?? 0) > 0;
  }

  async findBySupplierOrderId(supplierOrderId: number) {
    const row = await db.getOne<ExpensesRow>(`SELECT * FROM expenses WHERE supplier_order_id = $1 AND active = TRUE`, [supplierOrderId]);
    if (!row) return null;
    return new Expenses(row);
  }
}

export default new ExpensesRepository();
