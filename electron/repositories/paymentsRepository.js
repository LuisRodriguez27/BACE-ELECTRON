const db = require('../db');
const Payment = require('../domain/payments');
const cashSessionRepository = require('./cashSessionRepository');

class PaymentsRepository {
  _getBaseQuery() {
    return `
      SELECT 
        p.id, p.order_id, CAST(NULL AS INTEGER) as simple_order_id, p.cash_session_id, p.amount, p.date, p.descripcion, p.info, false as is_simple_order,
        o.id as o_id, o.client_id as o_client_id, o.status as o_status, o.total as o_total, c.name as o_client_name, o.description as o_description, o.notes as o_notes
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN clients c ON o.client_id = c.id
      UNION ALL
      SELECT 
        sp.id, CAST(NULL AS INTEGER) as order_id, sp.simple_order_id as simple_order_id, sp.cash_session_id, sp.amount, sp.date, sp.descripcion, so.concept as info, true as is_simple_order,
        CAST(NULL AS INTEGER) as o_id, CAST(NULL AS INTEGER) as o_client_id, 'Completada' as o_status, so.total as o_total, so.client_name as o_client_name, so.concept as o_description, NULL as o_notes
      FROM simple_order_payments sp
      LEFT JOIN simple_orders so ON sp.simple_order_id = so.id
    `;
  }

  _mapRow(row) {
    return new Payment({
      id: row.id,
      order_id: row.order_id,
      amount: parseFloat(row.amount),
      date: row.date,
      descripcion: row.descripcion,
      info: row.info,
      is_simple_order: Boolean(row.is_simple_order),
      simple_order_id: row.simple_order_id,
      order: (row.o_id || row.is_simple_order) ? {
        id: row.o_id || row.simple_order_id,
        client_id: row.o_client_id,
        status: row.o_status,
        total: parseFloat(row.o_total || 0),
        client_name: row.o_client_name,
        description: row.o_description,
        notes: row.o_notes,
      } : null,
    });
  }

  async findAll() {
    const rows = await db.getAll(`
      SELECT * FROM (${this._getBaseQuery()}) p
      ORDER BY p.date DESC
    `);

    return rows.map(row => this._mapRow(row));
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
    const activeSession = await cashSessionRepository.getActive();
    const cash_session_id = activeSession?.id ?? null;

    const result = await db.execute(
      'INSERT INTO payments (order_id, cash_session_id, amount, date, descripcion, info) VALUES ($1, $2, $3, $4, $5, $6)',
      [order_id || null, cash_session_id, amount, date, descripcion, info || null]
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

  async findPaginated(page = 1, limit = 20, filters = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const whereParams = [];

    // Filtros por tipo de orden
    if (filters.freeOnly || filters.orderFilter === 'free') {
      conditions.push('p.order_id IS NULL AND p.is_simple_order = false');
    } else if (filters.orderFilter === 'simple') {
      conditions.push('p.is_simple_order = true');
    }

    // Filtro: búsqueda
    if (filters.searchType && filters.searchTerm && String(filters.searchTerm).trim()) {
      const term = String(filters.searchTerm).trim();
      switch (filters.searchType) {
        case 'payment_id':
          whereParams.push(`%${term}%`);
          conditions.push(`CAST(p.id AS TEXT) LIKE $${whereParams.length}`);
          break;
        case 'order_id':
          whereParams.push(`%${term}%`);
          conditions.push(`(CAST(p.order_id AS TEXT) LIKE $${whereParams.length} OR CAST(p.simple_order_id AS TEXT) LIKE $${whereParams.length})`);
          break;
        case 'amount':
          whereParams.push(`%${term}%`);
          conditions.push(`CAST(p.amount AS TEXT) LIKE $${whereParams.length}`);
          break;
        case 'method':
          whereParams.push(term);
          conditions.push(`p.descripcion = $${whereParams.length}`);
          break;
        case 'info':
          whereParams.push(`%${term}%`);
          conditions.push(`p.info ILIKE $${whereParams.length}`);
          break;
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitIdx = whereParams.length + 1;
    const offsetIdx = whereParams.length + 2;
    const queryParams = [...whereParams, limit, offset];

    const baseQuery = this._getBaseQuery();

    const [countRow, rows] = await Promise.all([
      db.getOne(`
        SELECT COUNT(*) AS total
        FROM (${baseQuery}) p
        ${where}
      `, whereParams),
      db.getAll(`
        SELECT *
        FROM (${baseQuery}) p
        ${where}
        ORDER BY p.date DESC, p.is_simple_order DESC, p.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `, queryParams),
    ]);

    const total = parseInt(countRow.total, 10);

    return {
      data: rows.map(row => this._mapRow(row)),
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
}

module.exports = new PaymentsRepository();
