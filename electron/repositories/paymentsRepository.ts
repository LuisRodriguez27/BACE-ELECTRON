import db from '../db';
import Payment from '../domain/payments';
import cashSessionRepository from './cashSessionRepository';
import type { PaymentRow } from '../types/payment';
import type { OrderStatus } from '../types/order';

interface PaymentUnionRow {
  id: number;
  order_id: number | null;
  simple_order_id?: number | null;
  cash_session_id: number | null;
  amount: number;
  date: string;
  descripcion: string | null;
  info: string | null;
  phone: string | null;
  client_name: string | null;
  is_simple_order?: boolean;
  o_id: number | null;
  o_client_id: number | null;
  o_status: OrderStatus | null;
  o_total: number | null;
  o_client_name: string | null;
  o_description: string | null;
  o_notes: string | null;
  o_client_phone: string | null;
}

export interface PaymentFilters {
  freeOnly?: boolean;
  orderFilter?: 'free' | 'simple' | string;
  searchType?: 'payment_id' | 'order_id' | 'amount' | 'method' | 'info';
  searchTerm?: string;
}

class PaymentsRepository {
  private _getBaseQuery(): string {
    return `
      SELECT 
        p.id, p.order_id, CAST(NULL AS INTEGER) as simple_order_id, p.cash_session_id, p.amount, p.date, p.descripcion, p.info, p.phone, p.client_name, false as is_simple_order,
        o.id as o_id, o.client_id as o_client_id, o.status as o_status, o.total as o_total, c.name as o_client_name, o.description as o_description, o.notes as o_notes, c.phone as o_client_phone
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      UNION ALL
      SELECT 
        sp.id, CAST(NULL AS INTEGER) as order_id, sp.simple_order_id as simple_order_id, sp.cash_session_id, sp.amount, sp.date, sp.descripcion, so.concept as info, so.client_phone as phone, so.client_name as client_name, true as is_simple_order,
        CAST(NULL AS INTEGER) as o_id, CAST(NULL AS INTEGER) as o_client_id, 'Completada' as o_status, so.total as o_total, so.client_name as o_client_name, so.concept as o_description, NULL as o_notes, so.client_phone as o_client_phone
      FROM simple_order_payments sp
      LEFT JOIN simple_orders so ON sp.simple_order_id = so.id
    `;
  }

  private _mapRow(row: PaymentUnionRow): Payment {
    return new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: parseFloat(String(row.amount)),
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      phone: row.phone,
      client_name: row.client_name,
      is_simple_order: Boolean(row.is_simple_order),
      simple_order_id: row.simple_order_id || null,
      cash_session_id: row.cash_session_id,
      order: (row.o_id || row.is_simple_order) ? {
        id: row.o_id || row.simple_order_id || 0,
        client_id: row.o_client_id || 0,
        status: (row.o_status as OrderStatus) || 'Revision',
        total: parseFloat(String(row.o_total || 0)),
        client_name: row.o_client_name,
        description: row.o_description,
        notes: row.o_notes,
      } : null,
    });
  }

  async findAll(): Promise<Payment[]> {
    const rows = await db.getAll<PaymentUnionRow>(`SELECT * FROM (${this._getBaseQuery()}) p ORDER BY p.date DESC`);
    return rows.map(r => this._mapRow(r));
  }

  async findByOrderId(orderId: number): Promise<Payment[]> {
    const rows = await db.getAll<PaymentUnionRow>(`SELECT p.*, o.id as o_id, o.client_id as o_client_id, o.status as o_status, o.total as o_total, c.name as o_client_name, c.phone as o_client_phone, o.description as o_description, o.notes as o_notes FROM payments p LEFT JOIN orders o ON p.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE p.order_id = $1 ORDER BY p.date DESC`, [orderId]);
    return rows.map(r => this._mapRow(r));
  }

  async findById(id: number): Promise<Payment | null> {
    const row = await db.getOne<PaymentUnionRow>(`SELECT p.*, o.id as o_id, o.client_id as o_client_id, o.status as o_status, o.total as o_total, c.name as o_client_name, c.phone as o_client_phone, o.description as o_description, o.notes as o_notes FROM payments p LEFT JOIN orders o ON p.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE p.id = $1`, [id]);
    if (!row) return null;
    return this._mapRow(row);
  }

  async create({ order_id, amount, date, descripcion, info, phone, client_name }: { order_id?: number | null; amount: number; date: string; descripcion?: string | null; info?: string | null; phone?: string | null; client_name?: string | null }): Promise<Payment | null> {
    const activeSession = await cashSessionRepository.getActive();
    const cash_session_id = activeSession?.id ?? null;
    const result = await db.execute('INSERT INTO payments (order_id, cash_session_id, amount, date, descripcion, info, phone, client_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [order_id || null, cash_session_id, amount, date, descripcion, info || null, phone || null, client_name || null]);
    return await this.findById(result.lastInsertRowid!);
  }

  async update(id: number, { amount, descripcion, info, phone, client_name }: { amount: number; descripcion?: string | null; info?: string | null; phone?: string | null; client_name?: string | null }): Promise<boolean> {
    const result = await db.execute('UPDATE payments SET amount = $1, descripcion = $2, info = $3, phone = $4, client_name = $5 WHERE id = $6', [amount, descripcion, info || null, phone || null, client_name || null, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('DELETE FROM payments WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async findByClientId(clientId: number): Promise<Payment[]> {
    const rows = await db.getAll<PaymentUnionRow>(`SELECT p.*, o.id as o_id, o.client_id as o_client_id, o.status as o_status, o.total as o_total, c.name as o_client_name, c.phone as o_client_phone, o.description as o_description, o.notes as o_notes FROM payments p LEFT JOIN orders o ON p.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE o.client_id = $1 ORDER BY p.date DESC`, [clientId]);
    return rows.map(r => this._mapRow(r));
  }

  async getTotalPaymentsByOrderId(orderId: number): Promise<number> {
    const result = await db.getOne<{ total: string }>(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE order_id = $1`, [orderId]);
    return result ? parseFloat(result.total) || 0 : 0;
  }

  async findPaginated(page = 1, limit = 20, filters: PaymentFilters = {}) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const whereParams: unknown[] = [];

    if (filters.freeOnly || filters.orderFilter === 'free') { conditions.push('p.order_id IS NULL AND p.is_simple_order = false'); }
    else if (filters.orderFilter === 'simple') { conditions.push('p.is_simple_order = true'); }

    if (filters.searchType && filters.searchTerm && String(filters.searchTerm).trim()) {
      const term = String(filters.searchTerm).trim();
      switch (filters.searchType) {
        case 'payment_id': whereParams.push(`%${term}%`); conditions.push(`CAST(p.id AS TEXT) LIKE $${whereParams.length}`); break;
        case 'order_id': whereParams.push(`%${term}%`); conditions.push(`(CAST(p.order_id AS TEXT) LIKE $${whereParams.length} OR CAST(p.simple_order_id AS TEXT) LIKE $${whereParams.length})`); break;
        case 'amount': whereParams.push(`%${term}%`); conditions.push(`CAST(p.amount AS TEXT) LIKE $${whereParams.length}`); break;
        case 'method': whereParams.push(term); conditions.push(`p.descripcion = $${whereParams.length}`); break;
        case 'info': whereParams.push(`%${term}%`); conditions.push(`(p.info ILIKE $${whereParams.length} OR p.phone LIKE $${whereParams.length} OR p.client_name ILIKE $${whereParams.length})`); break;
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitIdx = whereParams.length + 1, offsetIdx = whereParams.length + 2;
    const queryParams = [...whereParams, limit, offset];
    const baseQuery = this._getBaseQuery();

    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM (${baseQuery}) p ${where}`, whereParams),
      db.getAll<PaymentUnionRow>(`SELECT * FROM (${baseQuery}) p ${where} ORDER BY p.date DESC, p.is_simple_order DESC, p.id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, queryParams),
    ]);

    const total = parseInt(countRow!.total, 10);
    return { data: rows.map(r => this._mapRow(r)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } };
  }
}

export default new PaymentsRepository();
