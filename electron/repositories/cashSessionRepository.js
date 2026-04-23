import db from '../db';
import CashSession from '../domain/cashSession';

class CashSessionRepository {
  async _hydrate(sessionRows) {
    if (!sessionRows.length) return [];

    const ids = sessionRows.map(r => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

    const [paymentsRows, orderPaymentsRows, expensesRows] = await Promise.all([
      // Pagos de órdenes simples
      db.getAll(`
        SELECT sop.*, u.username as user_username
        FROM simple_order_payments sop
        LEFT JOIN users u ON sop.user_id = u.id
        WHERE sop.cash_session_id IN (${placeholders})
        ORDER BY sop.date ASC
      `, ids),

      // Pagos de órdenes regulares
      db.getAll(`
        SELECT p.*
        FROM payments p
        WHERE p.cash_session_id IN (${placeholders})
        ORDER BY p.date ASC
      `, ids),

      // Gastos activos
      db.getAll(`
        SELECT e.*, u.username as user_username, ue.username as edited_by_username
        FROM expenses e
        LEFT JOIN users u  ON e.user_id   = u.id
        LEFT JOIN users ue ON e.edited_by = ue.id
        WHERE e.cash_session_id IN (${placeholders})
          AND e.active = TRUE
        ORDER BY e.date ASC
      `, ids),
    ]);

    const groupBy = (rows, key) =>
      rows.reduce((map, row) => {
        (map[row[key]] = map[row[key]] || []).push(row);
        return map;
      }, {});

    const paymentsBySession      = groupBy(paymentsRows,      'cash_session_id');
    const orderPaymentsBySession = groupBy(orderPaymentsRows, 'cash_session_id');
    const expensesBySession      = groupBy(expensesRows,      'cash_session_id');

    return sessionRows.map(row => new CashSession({
      ...row,
      payments:       paymentsBySession[row.id]      || [],
      order_payments: orderPaymentsBySession[row.id] || [],
      expenses:       expensesBySession[row.id]      || [],
    }));
  }

  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [countRow, rows] = await Promise.all([
      db.getOne(`SELECT COUNT(*) AS total FROM cash_sessions`),
      db.getAll(`
        SELECT c.*
        FROM cash_sessions c
        ORDER BY c.id DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);

    const sessions = await this._hydrate(rows);
    const total    = parseInt(countRow.total, 10);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getActive() {
    const row = await db.getOne(`
      SELECT c.*
      FROM cash_sessions c
      WHERE c.status = 'open'
      ORDER BY c.id DESC
      LIMIT 1
    `);
    if (!row) return null;
    const [session] = await this._hydrate([row]);
    return session;
  }

  async getClosed(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [countRow, rows] = await Promise.all([
      db.getOne(`SELECT COUNT(*) AS total FROM cash_sessions WHERE status = 'closed'`),
      db.getAll(`
        SELECT c.*
        FROM cash_sessions c
        WHERE c.status = 'closed'
        ORDER BY c.id DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);

    const sessions = await this._hydrate(rows);
    const total    = parseInt(countRow.total, 10);

    return {
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getById(id) {
    const row = await db.getOne(`
      SELECT c.*
      FROM cash_sessions c
      WHERE c.id = $1
    `, [id]);

    if (!row) return null;
    const [session] = await this._hydrate([row]);
    return session;
  }

  async getByDateRange(from, to) {
    const rows = await db.getAll(`
      SELECT c.*
      FROM cash_sessions c
      WHERE c.opening_date >= $1
        AND c.opening_date <= $2
      ORDER BY c.id DESC
    `, [from, to]);
    return this._hydrate(rows);
  }

  async open({ opening_balance = 0, notes = null }) {
    const existing = await this.getActive();
    if (existing) {
      throw new Error(`Ya existe una sesión de caja abierta (ID: ${existing.id}). Ciérrala antes de abrir una nueva.`);
    }

    const row = await db.getOne(`
      INSERT INTO cash_sessions (opening_date, opening_balance, expected_balance, closing_balance, status, notes)
      VALUES (NOW(), $1, $1, 0, 'open', $2)
      RETURNING *
    `, [parseFloat(opening_balance) || 0, notes || null]);

    const [session] = await this._hydrate([row]);
    return session;
  }

  async close(id, { closing_balance, notes } = {}) {
    const session = await this.getById(id);
    if (!session) throw new Error('Sesión de caja no encontrada.');
    if (!session.isActive()) throw new Error('La sesión ya está cerrada.');

    const expectedBalance = session.getExpectedBalance();

    const row = await db.getOne(`
      UPDATE cash_sessions
      SET
        status           = 'closed',
        closing_date     = NOW(),
        expected_balance = $1,
        closing_balance  = $2,
        notes            = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [expectedBalance, parseFloat(closing_balance) ?? expectedBalance, notes ?? null, id]);

    const [updated] = await this._hydrate([row]);
    return updated;
  }

  async update(id, data) {
    const session = await this.getById(id);
    if (!session) throw new Error('Sesión de caja no encontrada.');
    if (!session.isActive()) throw new Error('Solo se puede editar una sesión abierta.');

    const fields  = [];
    const values  = [];
    let   idx     = 1;

    if (data.opening_balance !== undefined) {
      fields.push(`opening_balance = $${idx++}`);
      values.push(parseFloat(data.opening_balance) || 0);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes || null);
    }

    if (fields.length === 0) return session; // nada que actualizar

    values.push(id);
    const row = await db.getOne(`
      UPDATE cash_sessions
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `, values);

    const [updated] = await this._hydrate([row]);
    return updated;
  }

  async getSummary(id) {
    const [session, totals] = await Promise.all([
      db.getOne(`SELECT * FROM cash_sessions WHERE id = $1`, [id]),
      db.getOne(`
        SELECT
          COALESCE(SUM(sop.amount), 0) AS total_simple_payments,
          COALESCE((
            SELECT SUM(p.amount) FROM payments p WHERE p.cash_session_id = $1
          ), 0)                        AS total_order_payments,
          COALESCE((
            SELECT SUM(e.amount) FROM expenses e WHERE e.cash_session_id = $1 AND e.active = TRUE
          ), 0)                        AS total_expenses
        FROM simple_order_payments sop
        WHERE sop.cash_session_id = $1
      `, [id]),
    ]);

    if (!session) return null;

    const totalIncome   = parseFloat(totals.total_simple_payments) + parseFloat(totals.total_order_payments);
    const totalExpenses = parseFloat(totals.total_expenses);
    const openingBal    = parseFloat(session.opening_balance);

    return {
      id:                    session.id,
      status:                session.status,
      opening_date:          session.opening_date,
      closing_date:          session.closing_date,
      opening_balance:       openingBal,
      total_simple_payments: parseFloat(totals.total_simple_payments),
      total_order_payments:  parseFloat(totals.total_order_payments),
      total_income:          totalIncome,
      total_expenses:        totalExpenses,
      expected_balance:      openingBal + totalIncome - totalExpenses,
      closing_balance:       parseFloat(session.closing_balance),
      notes:                 session.notes,
    };
  }
}

export default new CashSessionRepository();