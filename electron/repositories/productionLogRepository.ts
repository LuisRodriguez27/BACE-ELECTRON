import db from '../db';
import ProductionLog from '../domain/productionLog';
import type { ProductionLogRow } from '../types/productionLog';

class ProductionLogRepository {
  private _selectQuery = `
    SELECT pl.*, c.name AS client_name, u.username AS creator_name
    FROM production_logs pl
    LEFT JOIN orders o ON pl.order_id = o.id
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN users u ON pl.created_by = u.id
  `;

  async getActive(todayLocalStr: string) {
    const rows = await db.getAll<ProductionLogRow>(
      `${this._selectQuery} WHERE pl.active = TRUE AND (TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') >= $1 OR (TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 AND pl.completado = FALSE)) ORDER BY pl.created_at ASC, pl.id ASC`,
      [todayLocalStr]
    );
    return rows.map((r) => new ProductionLog(r));
  }

  async findAllPaginated(page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    const searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      searchCondition += ` AND (CAST(pl.id AS TEXT) = $${paramIndex} OR CAST(pl.order_id AS TEXT) = $${paramIndex} OR pl.descripcion ILIKE '%' || $${paramIndex} || '%' OR c.name ILIKE '%' || $${paramIndex} || '%' OR u.username ILIKE '%' || $${paramIndex} || '%')`;
      searchParams.push(term);
      paramIndex++;
    }
    if (searchDate && searchDate.trim()) {
      searchCondition += ` AND DATE(pl.created_at) = $${paramIndex}`;
      searchParams.push(searchDate.trim());
      paramIndex++;
    }

    const countResult = await db.getOne<{ total: string }>(
      `SELECT COUNT(*) as total FROM production_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id LEFT JOIN users u ON pl.created_by = u.id WHERE pl.active = TRUE ${searchCondition}`,
      searchParams
    );
    const total = parseInt(countResult!.total, 10);
    const rows = await db.getAll<ProductionLogRow>(
      `${this._selectQuery} WHERE pl.active = TRUE ${searchCondition} ORDER BY pl.created_at DESC, pl.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...searchParams, limit, offset]
    );

    return {
      data: rows.map((r) => new ProductionLog(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      searchTerm,
      searchDate
    };
  }

  async getById(id: number) {
    const row = await db.getOne<ProductionLogRow>(
      `${this._selectQuery} WHERE pl.id = $1 AND pl.active = TRUE`,
      [id]
    );
    if (!row) return null;
    return new ProductionLog(row);
  }

  async getByOrderId(orderId: number) {
    const rows = await db.getAll<ProductionLogRow>(
      `${this._selectQuery} WHERE pl.order_id = $1 AND pl.active = TRUE ORDER BY pl.created_at DESC, pl.id DESC`,
      [orderId]
    );
    return rows.map((r) => new ProductionLog(r));
  }

  async create({
    order_id,
    created_by,
    delivery_at,
    cantidad,
    descripcion,
    responsable,
    completado = false,
    created_at
  }: {
    order_id?: number | null;
    created_by?: number | null;
    delivery_at: string;
    cantidad: number;
    descripcion: string;
    responsable: string;
    completado?: boolean;
    created_at?: string | null;
  }) {
    const fields = ['order_id', 'created_by', 'delivery_at', 'cantidad', 'descripcion', 'responsable', 'completado', 'active'];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', 'TRUE'];
    const values: unknown[] = [
      order_id || null,
      created_by || null,
      delivery_at,
      cantidad !== undefined && cantidad !== null ? parseFloat(String(cantidad)) : 0,
      descripcion.trim(),
      responsable.trim(),
      completado || false
    ];
    if (created_at) {
      fields.push('created_at');
      placeholders.push(`$${values.length + 1}`);
      values.push(created_at);
    }
    const result = await db.execute(
      `INSERT INTO production_logs (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );
    return this.getById(result.lastInsertRowid!);
  }

  async update(
    id: number,
    data: {
      order_id?: number | null;
      created_by?: number | null;
      delivery_at?: string;
      cantidad?: number;
      descripcion?: string;
      responsable?: string;
      completado?: boolean;
      created_at?: string | null;
    }
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (data.order_id !== undefined) {
      fields.push(`order_id = $${idx++}`);
      values.push(data.order_id || null);
    }
    if (data.created_by !== undefined) {
      fields.push(`created_by = $${idx++}`);
      values.push(data.created_by || null);
    }
    if (data.delivery_at !== undefined) {
      fields.push(`delivery_at = $${idx++}`);
      values.push(data.delivery_at);
    }
    if (data.cantidad !== undefined) {
      fields.push(`cantidad = $${idx++}`);
      values.push(data.cantidad !== null ? parseFloat(String(data.cantidad)) : 0);
    }
    if (data.descripcion !== undefined) {
      fields.push(`descripcion = $${idx++}`);
      values.push(data.descripcion.trim());
    }
    if (data.responsable !== undefined) {
      fields.push(`responsable = $${idx++}`);
      values.push(data.responsable.trim());
    }
    if (data.completado !== undefined) {
      fields.push(`completado = $${idx++}`);
      values.push(data.completado);
    }
    if (data.created_at !== undefined) {
      fields.push(`created_at = $${idx++}`);
      values.push(data.created_at);
    }
    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await db.execute(
      `UPDATE production_logs SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`,
      values
    );
    return this.getById(id);
  }

  async updateCheckboxes(id: number, completado: boolean | string | number) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (completado !== undefined) {
      fields.push(`completado = $${idx++}`);
      values.push(completado === true || completado === 'true' || completado === 1);
    }
    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await db.execute(
      `UPDATE production_logs SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`,
      values
    );
    return this.getById(id);
  }

  async getHistoryDaysPaginated(
    todayLocalStr: string,
    page = 1,
    limit = 10,
    searchTerm = '',
    searchDate: string | null = null
  ) {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    const searchParams: unknown[] = [todayLocalStr];
    let paramIndex = 2;

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      searchCondition += ` AND (CAST(pl.id AS TEXT) = $${paramIndex} OR CAST(pl.order_id AS TEXT) = $${paramIndex} OR pl.descripcion ILIKE '%' || $${paramIndex} || '%' OR c.name ILIKE '%' || $${paramIndex} || '%' OR u.username ILIKE '%' || $${paramIndex} || '%')`;
      searchParams.push(term);
      paramIndex++;
    }
    if (searchDate && searchDate.trim()) {
      searchCondition += ` AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') = $${paramIndex}`;
      searchParams.push(searchDate.trim());
      paramIndex++;
    }

    const countResult = await db.getOne<{ total: string }>(
      `SELECT COUNT(DISTINCT TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD')) as total FROM production_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id LEFT JOIN users u ON pl.created_by = u.id WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 ${searchCondition}`,
      searchParams
    );
    const total = parseInt(countResult!.total, 10);

    const rows = await db.getAll(
      `SELECT TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as log_date, COUNT(*) as total_logs, BOOL_AND(pl.completado = TRUE) as all_completed FROM production_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id LEFT JOIN users u ON pl.created_by = u.id WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 ${searchCondition} GROUP BY log_date ORDER BY log_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...searchParams, limit, offset]
    );

    return {
      data: rows.map((r) => ({
        log_date: r.log_date,
        total_logs: parseInt(String(r.total_logs), 10),
        all_completed: r.all_completed === true
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      searchTerm,
      searchDate
    };
  }

  async getByDay(dateLocalStr: string) {
    const rows = await db.getAll<ProductionLogRow>(
      `${this._selectQuery} WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') = $1 ORDER BY pl.id ASC`,
      [dateLocalStr]
    );
    return rows.map((r) => new ProductionLog(r));
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute(
      `UPDATE production_logs SET active = FALSE WHERE id = $1 AND active = TRUE`,
      [id]
    );
    return (result.changes ?? 0) > 0;
  }
}

export default new ProductionLogRepository();
