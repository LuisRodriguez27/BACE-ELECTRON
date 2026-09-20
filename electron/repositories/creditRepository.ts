import db from '../db';
import Credit from '../domain/credit';
import CreditItem from '../domain/creditItem';
import type {
  CreditItemRow,
  CreditPaymentRow,
  CreditRow,
  CreditSourceSearchResult,
  CreditSourceType,
  CreditStatus,
} from '../types/credit';

const CREDIT_SELECT = `
  SELECT cr.*, c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
         u.username AS created_by_username
  FROM credits cr
  JOIN clients c ON cr.client_id = c.id
  LEFT JOIN users u ON cr.created_by = u.id
`;

const CREDIT_ITEM_SELECT = `
  SELECT ci.*,
         COALESCE(oc.name, so.client_name) AS source_client_name,
         COALESCE(oc.phone, so.client_phone) AS source_client_phone,
         COALESCE(o.total, so.total) AS source_total,
         u.username AS created_by_username,
         ue.username AS edited_by_username
  FROM credit_items ci
  LEFT JOIN orders o ON ci.order_id = o.id
  LEFT JOIN clients oc ON o.client_id = oc.id
  LEFT JOIN simple_orders so ON ci.simple_order_id = so.id
  LEFT JOIN users u ON ci.created_by = u.id
  LEFT JOIN users ue ON ci.edited_by = ue.id
`;

class CreditRepository {
  private _buildCreditFilters(searchTerm = '', status?: CreditStatus, from?: string | null, to?: string | null) {
    const conditions = ['cr.active = TRUE'];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`cr.status = $${params.length}`);
    }
    if (searchTerm.trim()) {
      params.push(`%${searchTerm.trim()}%`);
      conditions.push(`(CAST(cr.id AS TEXT) ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }
    if (from) {
      params.push(from);
      conditions.push(`(cr.opened_at AT TIME ZONE 'America/Mexico_City')::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`(cr.opened_at AT TIME ZONE 'America/Mexico_City')::date <= $${params.length}::date`);
    }

    return { params, where: `WHERE ${conditions.join(' AND ')}` };
  }

  private async _hydrate(rows: CreditRow[]): Promise<InstanceType<typeof Credit>[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const [itemRows, paymentRows] = await Promise.all([
      db.getAll<CreditItemRow>(
        `${CREDIT_ITEM_SELECT}
         WHERE ci.credit_id IN (${placeholders}) AND ci.active = TRUE
         ORDER BY ci.date ASC, ci.id ASC`,
        ids
      ),
      db.getAll<CreditPaymentRow>(
        `SELECT p.id, p.credit_id, p.cash_session_id, p.created_by, p.amount, p.date,
                p.descripcion, p.info, p.client_name, p.phone,
                u.username AS created_by_username
         FROM payments p
         LEFT JOIN users u ON p.created_by = u.id
         WHERE p.credit_id IN (${placeholders})
         ORDER BY p.date ASC, p.id ASC`,
        ids
      ),
    ]);

    const itemsByCredit = itemRows.reduce((map: Record<string, CreditItemRow[]>, item) => {
      const key = String(item.credit_id);
      (map[key] = map[key] || []).push(item);
      return map;
    }, {});
    const paymentsByCredit = paymentRows.reduce((map: Record<string, CreditPaymentRow[]>, payment) => {
      const key = String(payment.credit_id);
      (map[key] = map[key] || []).push(payment);
      return map;
    }, {});

    return rows.map((row) => new Credit({
      ...row,
      items: itemsByCredit[String(row.id)] || [],
      payments: paymentsByCredit[String(row.id)] || [],
    }));
  }

  async findPaginated(page = 1, limit = 20, searchTerm = '', status?: CreditStatus, from?: string | null, to?: string | null) {
    const offset = (page - 1) * limit;
    const { params, where } = this._buildCreditFilters(searchTerm, status, from, to);
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(
        `SELECT COUNT(*) AS total FROM credits cr JOIN clients c ON cr.client_id = c.id ${where}`,
        params
      ),
      db.getAll<CreditRow>(
        `${CREDIT_SELECT} ${where} ORDER BY cr.opened_at DESC, cr.id DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        [...params, limit, offset]
      ),
    ]);

    const credits = await this._hydrate(rows);
    const total = parseInt(countRow?.total || '0', 10);
    const totalPages = Math.ceil(total / limit);
    return {
      data: credits,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async findForPrint(searchTerm = '', status?: CreditStatus, from?: string | null, to?: string | null) {
    const { params, where } = this._buildCreditFilters(searchTerm, status, from, to);
    const rows = await db.getAll<CreditRow>(
      `${CREDIT_SELECT} ${where} ORDER BY cr.opened_at DESC, cr.id DESC`,
      params
    );
    return this._hydrate(rows);
  }

  async findById(id: number) {
    const row = await db.getOne<CreditRow>(`${CREDIT_SELECT} WHERE cr.id = $1 AND cr.active = TRUE`, [id]);
    if (!row) return null;
    const [credit] = await this._hydrate([row]);
    return credit;
  }

  async findOpenByClientId(clientId: number) {
    const row = await db.getOne<CreditRow>(
      `${CREDIT_SELECT} WHERE cr.client_id = $1 AND cr.status = 'open' AND cr.active = TRUE ORDER BY cr.id DESC LIMIT 1`,
      [clientId]
    );
    if (!row) return null;
    const [credit] = await this._hydrate([row]);
    return credit;
  }

  async lockById(id: number): Promise<boolean> {
    const row = await db.getOne<{ id: number }>(
      `SELECT id FROM credits WHERE id = $1 AND active = TRUE FOR UPDATE`,
      [id]
    );
    return !!row;
  }

  async create(data: { client_id: number; created_by: number; notes?: string | null }) {
    const row = await db.getOne<CreditRow>(
      `INSERT INTO credits (client_id, opened_at, status, notes, created_by, active)
       VALUES ($1, NOW(), 'open', $2, $3, TRUE) RETURNING *`,
      [data.client_id, data.notes || null, data.created_by]
    );
    return row ? this.findById(row.id) : null;
  }

  async updateNotes(id: number, notes: string | null) {
    await db.execute(`UPDATE credits SET notes = $1 WHERE id = $2 AND active = TRUE`, [notes, id]);
    return this.findById(id);
  }

  async close(id: number, notes?: string | null) {
    const row = await db.getOne<CreditRow>(
      `UPDATE credits
       SET status = 'closed', closing_date = NOW(), notes = COALESCE($1, notes)
       WHERE id = $2 AND active = TRUE RETURNING *`,
      [notes ?? null, id]
    );
    if (!row) return null;
    const [credit] = await this._hydrate([row]);
    return credit;
  }

  async reopen(id: number) {
    const row = await db.getOne<CreditRow>(
      `UPDATE credits SET status = 'open', closing_date = NULL WHERE id = $1 AND active = TRUE RETURNING *`,
      [id]
    );
    if (!row) return null;
    const [credit] = await this._hydrate([row]);
    return credit;
  }

  async getItemById(id: number) {
    const row = await db.getOne<CreditItemRow>(`${CREDIT_ITEM_SELECT} WHERE ci.id = $1`, [id]);
    return row ? new CreditItem(row) : null;
  }

  async getActiveItemByOrder(orderId: number) {
    const row = await db.getOne<CreditItemRow>(
      `${CREDIT_ITEM_SELECT} WHERE ci.order_id = $1 AND ci.active = TRUE`,
      [orderId]
    );
    return row ? new CreditItem(row) : null;
  }

  async getActiveItemBySimpleOrder(simpleOrderId: number) {
    const row = await db.getOne<CreditItemRow>(
      `${CREDIT_ITEM_SELECT} WHERE ci.simple_order_id = $1 AND ci.active = TRUE`,
      [simpleOrderId]
    );
    return row ? new CreditItem(row) : null;
  }

  async addItem(data: {
    credit_id: number;
    order_id: number | null;
    simple_order_id: number | null;
    date: string;
    product: string;
    quantity: number;
    unit_price: number;
    total: number;
    created_by: number;
  }) {
    const row = await db.getOne<{ id: number }>(
      `INSERT INTO credit_items
        (credit_id, order_id, simple_order_id, date, product, quantity, unit_price, total, created_by, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id`,
      [data.credit_id, data.order_id, data.simple_order_id, data.date, data.product, data.quantity, data.unit_price, data.total, data.created_by]
    );
    return row ? this.getItemById(row.id) : null;
  }

  async updateItem(id: number, data: { date: string; product: string; quantity: number; unit_price: number; total: number; edited_by: number }) {
    await db.execute(
      `UPDATE credit_items
       SET date = $1, product = $2, quantity = $3, unit_price = $4, total = $5, edited_by = $6
       WHERE id = $7 AND active = TRUE`,
      [data.date, data.product, data.quantity, data.unit_price, data.total, data.edited_by, id]
    );
    return this.getItemById(id);
  }

  async removeItem(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE credit_items SET active = FALSE WHERE id = $1 AND active = TRUE`, [id]);
    return (result.changes ?? 0) > 0;
  }

  async getTotalCharges(creditId: number): Promise<number> {
    const row = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) AS total FROM credit_items WHERE credit_id = $1 AND active = TRUE`,
      [creditId]
    );
    return parseFloat(String(row?.total || 0));
  }

  async getTotalPayments(creditId: number): Promise<number> {
    const row = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE credit_id = $1`,
      [creditId]
    );
    return parseFloat(String(row?.total || 0));
  }

  async getAllocatedAmountForItem(creditItemId: number): Promise<number> {
    const row = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM credit_payment_allocations WHERE credit_item_id = $1`,
      [creditItemId]
    );
    return parseFloat(String(row?.total || 0));
  }

  async getItemsWithOutstandingBalance(creditId: number): Promise<Array<CreditItemRow & { allocated_amount: number }>> {
    const rows = await db.getAll<CreditItemRow & { allocated_amount: number }>(`
      SELECT ci.*, COALESCE(SUM(cpa.amount), 0) AS allocated_amount
      FROM credit_items ci
      LEFT JOIN credit_payment_allocations cpa ON cpa.credit_item_id = ci.id
      WHERE ci.credit_id = $1 AND ci.active = TRUE
      GROUP BY ci.id
      HAVING ci.total - COALESCE(SUM(cpa.amount), 0) > 0
      ORDER BY ci.date ASC, ci.id ASC
    `, [creditId]);
    return rows.map((row) => ({ ...row, allocated_amount: parseFloat(String(row.allocated_amount)) || 0 }));
  }

  async addPaymentAllocation(creditPaymentId: number, creditItemId: number, amount: number): Promise<void> {
    await db.execute(
      `INSERT INTO credit_payment_allocations (credit_payment_id, credit_item_id, amount)
       VALUES ($1, $2, $3)`,
      [creditPaymentId, creditItemId, amount]
    );
  }

  async removePaymentAllocations(creditPaymentId: number): Promise<void> {
    await db.execute(`DELETE FROM credit_payment_allocations WHERE credit_payment_id = $1`, [creditPaymentId]);
  }

  async removeCreditPaymentAllocations(creditId: number): Promise<void> {
    await db.execute(`
      DELETE FROM credit_payment_allocations cpa
      USING payments p
      WHERE cpa.credit_payment_id = p.id AND p.credit_id = $1
    `, [creditId]);
  }

  async getPaymentAmountsByCreditId(creditId: number): Promise<Array<{ id: number; amount: number }>> {
    const rows = await db.getAll<{ id: number; amount: number }>(
      `SELECT id, amount FROM payments WHERE credit_id = $1 ORDER BY date ASC, id ASC`,
      [creditId]
    );
    return rows.map((row) => ({ id: row.id, amount: parseFloat(String(row.amount)) || 0 }));
  }

  async getAllocatedAmountByOrder(orderId: number): Promise<number> {
    const row = await db.getOne<{ total: number }>(`
      SELECT COALESCE(SUM(cpa.amount), 0) AS total
      FROM credit_payment_allocations cpa
      JOIN credit_items ci ON ci.id = cpa.credit_item_id
      WHERE ci.order_id = $1 AND ci.active = TRUE
    `, [orderId]);
    return parseFloat(String(row?.total || 0));
  }

  async getAllocatedAmountBySimpleOrder(simpleOrderId: number): Promise<number> {
    const row = await db.getOne<{ total: number }>(`
      SELECT COALESCE(SUM(cpa.amount), 0) AS total
      FROM credit_payment_allocations cpa
      JOIN credit_items ci ON ci.id = cpa.credit_item_id
      WHERE ci.simple_order_id = $1 AND ci.active = TRUE
    `, [simpleOrderId]);
    return parseFloat(String(row?.total || 0));
  }

  async getCreditedAmountByOrder(orderId: number, excludeItemId?: number): Promise<number> {
    const params: unknown[] = [orderId];
    let exclude = '';
    if (excludeItemId) {
      params.push(excludeItemId);
      exclude = `AND id <> $2`;
    }
    const row = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) AS total FROM credit_items
       WHERE order_id = $1 AND active = TRUE ${exclude}`,
      params
    );
    return parseFloat(String(row?.total || 0));
  }

  async getCreditedAmountBySimpleOrder(simpleOrderId: number, excludeItemId?: number): Promise<number> {
    const params: unknown[] = [simpleOrderId];
    let exclude = '';
    if (excludeItemId) {
      params.push(excludeItemId);
      exclude = `AND id <> $2`;
    }
    const row = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(total), 0) AS total FROM credit_items
       WHERE simple_order_id = $1 AND active = TRUE ${exclude}`,
      params
    );
    return parseFloat(String(row?.total || 0));
  }

  async searchAvailableSources(searchTerm = '', limit = 20, sourceType?: Exclude<CreditSourceType, 'manual'>): Promise<CreditSourceSearchResult[]> {
    const params: unknown[] = [];
    let search = '';
    if (searchTerm.trim()) {
      params.push(`%${searchTerm.trim()}%`);
      const searchIndex = params.length;
      search = `AND (CAST(src.id AS TEXT) ILIKE $${searchIndex} OR src.product ILIKE $${searchIndex} OR src.client_name ILIKE $${searchIndex} OR src.client_phone ILIKE $${searchIndex})`;
    }
    let sourceFilter = '';
    if (sourceType) {
      params.push(sourceType);
      sourceFilter = `AND src.source_type = $${params.length}`;
    }
    params.push(limit);
    const limitIndex = params.length;

    const rows = await db.getAll<CreditSourceSearchResult>(`
      WITH normal_payments AS (
        SELECT order_id, COALESCE(SUM(amount), 0) AS paid
        FROM payments WHERE order_id IS NOT NULL GROUP BY order_id
      ),
      normal_credits AS (
        SELECT order_id, COALESCE(SUM(total), 0) AS credited
        FROM credit_items WHERE order_id IS NOT NULL AND active = TRUE GROUP BY order_id
      ),
      simple_payments AS (
        SELECT simple_order_id, COALESCE(SUM(amount), 0) AS paid
        FROM simple_order_payments GROUP BY simple_order_id
      ),
      simple_credits AS (
        SELECT simple_order_id, COALESCE(SUM(total), 0) AS credited
        FROM credit_items WHERE simple_order_id IS NOT NULL AND active = TRUE GROUP BY simple_order_id
      ),
      sources AS (
        SELECT 'order'::text AS source_type, o.id, o.date,
               COALESCE(NULLIF(o.description, ''), 'Orden #' || o.id::text) AS product,
               c.name AS client_name, c.phone AS client_phone, o.total,
               COALESCE(np.paid, 0) AS paid, COALESCE(nc.credited, 0) AS credited,
               GREATEST(0, o.total - COALESCE(np.paid, 0) - COALESCE(nc.credited, 0)) AS available
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        LEFT JOIN normal_payments np ON o.id = np.order_id
        LEFT JOIN normal_credits nc ON o.id = nc.order_id
        WHERE o.active = TRUE AND o.status <> 'Cancelado'

        UNION ALL

        SELECT 'simple_order'::text AS source_type, so.id, so.date, so.concept AS product,
               so.client_name, so.client_phone, so.total,
               COALESCE(sp.paid, 0) AS paid, COALESCE(sc.credited, 0) AS credited,
               GREATEST(0, so.total - COALESCE(sp.paid, 0) - COALESCE(sc.credited, 0)) AS available
        FROM simple_orders so
        LEFT JOIN simple_payments sp ON so.id = sp.simple_order_id
        LEFT JOIN simple_credits sc ON so.id = sc.simple_order_id
        WHERE so.active = TRUE
      )
      SELECT * FROM sources src
      WHERE src.available > 0 AND src.credited = 0 ${sourceFilter} ${search}
      ORDER BY src.id DESC
      LIMIT $${limitIndex}
    `, params);

    return rows.map((row) => ({
      ...row,
      total: parseFloat(String(row.total)) || 0,
      paid: parseFloat(String(row.paid)) || 0,
      credited: parseFloat(String(row.credited)) || 0,
      available: parseFloat(String(row.available)) || 0,
    }));
  }
}

export default new CreditRepository();
