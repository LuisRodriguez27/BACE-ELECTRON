const db = require('../db');
const Expenses = require('../domain/expenses');

class ExpensesRepository {

  async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [countRow, rows] = await Promise.all([
      db.getOne(`SELECT COUNT(*) AS total FROM expenses WHERE active = TRUE`),
      db.getAll(`
        SELECT e.*,
              u.username  AS user_username,
              ue.username AS edited_by_username
        FROM expenses e
        LEFT JOIN users u  ON e.user_id   = u.id
        LEFT JOIN users ue ON e.edited_by = ue.id
        WHERE e.active = TRUE
        ORDER BY e.date DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);

    const total = parseInt(countRow.total, 10);
    return {
      data: rows.map(r => new Expenses(r)),
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

  async getByCashSession(cashSessionId) {
    const rows = await db.getAll(`
      SELECT e.*,
            u.username  AS user_username,
            ue.username AS edited_by_username
      FROM expenses e
      LEFT JOIN users u  ON e.user_id   = u.id
      LEFT JOIN users ue ON e.edited_by = ue.id
      WHERE e.cash_session_id = $1
        AND e.active = TRUE
      ORDER BY e.date ASC
    `, [cashSessionId]);
    return rows.map(r => new Expenses(r));
  }

  async getById(id) {
    const row = await db.getOne(`
      SELECT e.*,
            u.username  AS user_username,
            ue.username AS edited_by_username
      FROM expenses e
      LEFT JOIN users u  ON e.user_id   = u.id
      LEFT JOIN users ue ON e.edited_by = ue.id
      WHERE e.id = $1
    `, [id]);
    if (!row) return null;
    return new Expenses(row);
  }

  async create({ cash_session_id, user_id, amount, description, date }) {
    const row = await db.getOne(`
      INSERT INTO expenses (cash_session_id, user_id, amount, description, date, active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `, [cash_session_id, user_id, parseFloat(amount), description.trim(), date]);
    return this.getById(row.id);
  }

  async update(id, { amount, description, date, edited_by }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (amount      !== undefined) { fields.push(`amount      = $${idx++}`); values.push(parseFloat(amount)); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description.trim()); }
    if (date        !== undefined) { fields.push(`date        = $${idx++}`); values.push(date); }
    if (edited_by   !== undefined) { fields.push(`edited_by   = $${idx++}`); values.push(edited_by); }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    await db.execute(`
      UPDATE expenses
      SET ${fields.join(', ')}
      WHERE id = $${idx} AND active = TRUE
    `, values);

    return this.getById(id);
  }

  async delete(id) {
    const result = await db.execute(`
      UPDATE expenses SET active = FALSE WHERE id = $1 AND active = TRUE
    `, [id]);
    return result.changes > 0;
  }
}

module.exports = new ExpensesRepository();
