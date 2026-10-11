import db from '../db';
import CashSession from '../domain/cashSession';
import type { CashSessionRow, SimpleOrderPaymentRow, PaymentRow, ExpensesRow } from '../types/domain';

class CashSessionRepository {
  private async _hydrate(sessionRows: CashSessionRow[]): Promise<CashSession[]> {
    if (!sessionRows.length) return [];
    const ids = sessionRows.map(r => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

    const paymentsRows = await db.getAll<SimpleOrderPaymentRow>(
      `SELECT sop.*, u.username as user_username FROM simple_order_payments sop LEFT JOIN users u ON sop.user_id = u.id WHERE sop.cash_session_id IN (${placeholders}) ORDER BY sop.date ASC`,
      ids
    );
    const orderPaymentsRows = await db.getAll<PaymentRow>(
      `SELECT p.* FROM payments p WHERE p.cash_session_id IN (${placeholders}) ORDER BY p.date ASC`,
      ids
    );
    const expensesRows = await db.getAll<ExpensesRow>(
      `SELECT e.*, u.username as user_username, ue.username as edited_by_username FROM expenses e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN users ue ON e.edited_by = ue.id WHERE e.cash_session_id IN (${placeholders}) AND e.active = TRUE ORDER BY e.date ASC`,
      ids
    );

    const groupBy = <T>(rows: T[], key: keyof T) =>
      rows.reduce((map: Record<string, T[]>, row) => {
        const k = String(row[key]);
        (map[k] = map[k] || []).push(row);
        return map;
      }, {});

    const paymentsBySession      = groupBy(paymentsRows, 'cash_session_id');
    const orderPaymentsBySession = groupBy(orderPaymentsRows, 'cash_session_id');
    const expensesBySession      = groupBy(expensesRows, 'cash_session_id');

    return sessionRows.map(row => new CashSession({
      ...row,
      payments:       paymentsBySession[String(row.id)]      || [],
      order_payments: orderPaymentsBySession[String(row.id)] || [],
      expenses:       expensesBySession[String(row.id)]      || [],
    }));
  }

  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM cash_sessions`),
      db.getAll<CashSessionRow>(`SELECT c.* FROM cash_sessions c ORDER BY c.id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    ]);
    const sessions = await this._hydrate(rows);
    const total = parseInt(countRow!.total, 10);
    return { data: sessions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } };
  }

  async getActive() {
    const row = await db.getOne<CashSessionRow>(`SELECT c.* FROM cash_sessions c WHERE c.status = 'open' ORDER BY c.id DESC LIMIT 1`);
    if (!row) return null;
    const [session] = await this._hydrate([row]);
    return session;
  }

  async getClosed(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM cash_sessions WHERE status = 'closed'`),
      db.getAll<CashSessionRow>(`SELECT c.* FROM cash_sessions c WHERE c.status = 'closed' ORDER BY c.id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    ]);
    const sessions = await this._hydrate(rows);
    const total = parseInt(countRow!.total, 10);
    return { data: sessions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } };
  }

  async getById(id: number) {
    const row = await db.getOne<CashSessionRow>(`SELECT c.* FROM cash_sessions c WHERE c.id = $1`, [id]);
    if (!row) return null;
    const [session] = await this._hydrate([row]);
    return session;
  }

  async getByDateRange(from: string, to: string) {
    const rows = await db.getAll<CashSessionRow>(`SELECT c.* FROM cash_sessions c WHERE c.opening_date >= $1 AND c.opening_date <= $2 ORDER BY c.id DESC`, [from, to]);
    return this._hydrate(rows);
  }

  async open({ opening_balance = 0, notes = null }: { opening_balance?: number; notes?: string | null }) {
    const existing = await this.getActive();
    if (existing) throw new Error(`Ya existe una sesión de caja abierta (ID: ${existing.id}). Ciérrala antes de abrir una nueva.`);
    const row = await db.getOne<CashSessionRow>(`INSERT INTO cash_sessions (opening_date, opening_balance, expected_balance, closing_balance, status, notes) VALUES (NOW(), $1, $1, 0, 'open', $2) RETURNING *`, [parseFloat(String(opening_balance)) || 0, notes || null]);
    const [session] = await this._hydrate([row!]);
    return session;
  }

  async close(id: number, { closing_balance, notes }: { closing_balance?: number; notes?: string | null } = {}) {
    const session = await this.getById(id);
    if (!session) throw new Error('Sesión de caja no encontrada.');
    if (!session.isActive()) throw new Error('La sesión ya está cerrada.');
    const expectedBalance = session.getExpectedBalance();
    const row = await db.getOne<CashSessionRow>(`UPDATE cash_sessions SET status = 'closed', closing_date = NOW(), expected_balance = $1, closing_balance = $2, notes = COALESCE($3, notes) WHERE id = $4 RETURNING *`, [expectedBalance, parseFloat(String(closing_balance ?? expectedBalance)), notes ?? null, id]);
    const [updated] = await this._hydrate([row!]);
    return updated;
  }

  async reopen(id: number) {
    const existing = await this.getActive();
    if (existing) throw new Error(`No se puede reabrir la sesión porque ya existe una sesión de caja abierta (ID: ${existing.id}).`);
    const session = await this.getById(id);
    if (!session) throw new Error('Sesión de caja no encontrada.');
    if (session.isActive()) throw new Error('La sesión de caja ya está abierta.');
    const row = await db.getOne<CashSessionRow>(`UPDATE cash_sessions SET status = 'open', closing_date = NULL, closing_balance = 0 WHERE id = $1 RETURNING *`, [id]);
    const [updated] = await this._hydrate([row!]);
    return updated;
  }

  async update(id: number, data: { opening_balance?: number; notes?: string | null }) {
    const session = await this.getById(id);
    if (!session) throw new Error('Sesión de caja no encontrada.');
    if (!session.isActive()) throw new Error('Solo se puede editar una sesión abierta.');
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;
    if (data.opening_balance !== undefined) { fields.push(`opening_balance = $${idx++}`); values.push(parseFloat(String(data.opening_balance)) || 0); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes || null); }
    if (fields.length === 0) return session;
    values.push(id);
    const row = await db.getOne<CashSessionRow>(`UPDATE cash_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    const [updated] = await this._hydrate([row!]);
    return updated;
  }

  async getSummary(id: number) {
    const [session, totals] = await Promise.all([
      db.getOne<{ id: number; status: string; opening_date: string; closing_date: string | null; opening_balance: string; closing_balance: string; notes: string | null }>(`SELECT * FROM cash_sessions WHERE id = $1`, [id]),
      db.getOne<{ total_simple_payments: string; total_order_payments: string; total_expenses: string }>(`
        SELECT COALESCE(SUM(sop.amount), 0) AS total_simple_payments,
               COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.cash_session_id = $1), 0) AS total_order_payments,
               COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.cash_session_id = $1 AND e.active = TRUE), 0) AS total_expenses
        FROM simple_order_payments sop WHERE sop.cash_session_id = $1
      `, [id]),
    ]);
    if (!session) return null;
    const totalIncome = parseFloat(totals!.total_simple_payments) + parseFloat(totals!.total_order_payments);
    const totalExpenses = parseFloat(totals!.total_expenses);
    const openingBal = parseFloat(session.opening_balance);
    return { id: session.id, status: session.status, opening_date: session.opening_date, closing_date: session.closing_date, opening_balance: openingBal, total_simple_payments: parseFloat(totals!.total_simple_payments), total_order_payments: parseFloat(totals!.total_order_payments), total_income: totalIncome, total_expenses: totalExpenses, expected_balance: openingBal + totalIncome - totalExpenses, closing_balance: parseFloat(session.closing_balance), notes: session.notes };
  }
}

export default new CashSessionRepository();
