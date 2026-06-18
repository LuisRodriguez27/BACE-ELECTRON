import db from '../db';
import PrintLog from '../domain/printLog';
import type { PrintLogRow } from '../types/printLog';

class PrintLogRepository {
  private _selectQuery = `
    SELECT pl.*, c.name AS client_name
    FROM print_logs pl
    LEFT JOIN orders o ON pl.order_id = o.id
    LEFT JOIN clients c ON o.client_id = c.id
  `;

  async getActive(todayLocalStr: string) {
    const rows = await db.getAll<PrintLogRow>(`${this._selectQuery} WHERE pl.active = TRUE AND (TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') >= $1 OR (TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 AND pl.completado = FALSE)) ORDER BY pl.created_at ASC, pl.hora_entrega ASC`, [todayLocalStr]);
    return rows.map((r) => new PrintLog(r));
  }

  async findAllPaginated(page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    const searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      searchCondition += ` AND (CAST(pl.id AS TEXT) = $${paramIndex} OR CAST(pl.order_id AS TEXT) = $${paramIndex})`;
      searchParams.push(term);
      paramIndex++;
    }
    if (searchDate && searchDate.trim()) {
      searchCondition += ` AND DATE(pl.created_at) = $${paramIndex}`;
      searchParams.push(searchDate.trim());
      paramIndex++;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM print_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE pl.active = TRUE ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10);
    const rows = await db.getAll<PrintLogRow>(`${this._selectQuery} WHERE pl.active = TRUE ${searchCondition} ORDER BY pl.created_at DESC, pl.hora_entrega DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    return { data: rows.map((r) => new PrintLog(r)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }, searchTerm, searchDate };
  }

  async getById(id: number) {
    const row = await db.getOne<PrintLogRow>(`${this._selectQuery} WHERE pl.id = $1 AND pl.active = TRUE`, [id]);
    if (!row) return null;
    return new PrintLog(row);
  }

  async getByOrderId(orderId: number) {
    const rows = await db.getAll<PrintLogRow>(`${this._selectQuery} WHERE pl.order_id = $1 AND pl.active = TRUE ORDER BY pl.hora_entrega DESC`, [orderId]);
    return rows.map((r) => new PrintLog(r));
  }

  async create({ order_id, descripcion, hora_entrega, responsable, observaciones, envio, pago, completado = false, status = 'Pendiente', created_at }: { order_id?: number | null; descripcion: string; hora_entrega: string; responsable: string; observaciones?: string | null; envio: string; pago?: number | null; completado?: boolean; status?: string; created_at?: string | null }) {
    const fields = ['order_id', 'descripcion', 'hora_entrega', 'responsable', 'observaciones', 'envio', 'pago', 'completado', 'status', 'active'];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', 'TRUE'];
    const values: unknown[] = [order_id || null, descripcion.trim(), hora_entrega, responsable.trim(), observaciones ? observaciones.trim() : null, envio.trim(), pago !== undefined && pago !== null ? parseFloat(String(pago)) : null, completado || false, status || 'Pendiente'];
    if (created_at) { fields.push('created_at'); placeholders.push(`$${values.length + 1}`); values.push(created_at); }
    const result = await db.execute(`INSERT INTO print_logs (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
    return this.getById(result.lastInsertRowid!);
  }

  async update(id: number, printLogData: { order_id?: number | null; descripcion?: string; hora_entrega?: string; responsable?: string; observaciones?: string | null; envio?: string; pago?: number | null; completado?: boolean; status?: string; created_at?: string | null }) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (printLogData.order_id !== undefined) { fields.push(`order_id = $${idx++}`); values.push(printLogData.order_id || null); }
    if (printLogData.descripcion !== undefined) { fields.push(`descripcion = $${idx++}`); values.push(printLogData.descripcion.trim()); }
    if (printLogData.hora_entrega !== undefined) { fields.push(`hora_entrega = $${idx++}`); values.push(printLogData.hora_entrega); }
    if (printLogData.responsable !== undefined) { fields.push(`responsable = $${idx++}`); values.push(printLogData.responsable.trim()); }
    if (printLogData.observaciones !== undefined) { fields.push(`observaciones = $${idx++}`); values.push(printLogData.observaciones ? printLogData.observaciones.trim() : null); }
    if (printLogData.envio !== undefined) { fields.push(`envio = $${idx++}`); values.push(printLogData.envio.trim()); }
    if (printLogData.pago !== undefined) { fields.push(`pago = $${idx++}`); values.push(printLogData.pago !== null ? parseFloat(String(printLogData.pago)) : null); }
    if (printLogData.completado !== undefined) { fields.push(`completado = $${idx++}`); values.push(printLogData.completado); }
    if (printLogData.status !== undefined) { fields.push(`status = $${idx++}`); values.push(printLogData.status); }
    if (printLogData.created_at !== undefined) { fields.push(`created_at = $${idx++}`); values.push(printLogData.created_at); }
    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await db.execute(`UPDATE print_logs SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`, values);
    return this.getById(id);
  }

  async updateCheckboxes(id: number, completado: boolean | string | number) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (completado !== undefined) { fields.push(`completado = $${idx++}`); values.push(completado === true || completado === 'true' || completado === 1); }
    if (fields.length === 0) return this.getById(id);
    values.push(id);
    await db.execute(`UPDATE print_logs SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`, values);
    return this.getById(id);
  }

  async getHistoryDaysPaginated(todayLocalStr: string, page = 1, limit = 10, searchTerm = '', searchDate: string | null = null) {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    const searchParams: unknown[] = [todayLocalStr];
    let paramIndex = 2;

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      searchCondition += ` AND (CAST(pl.id AS TEXT) = $${paramIndex} OR CAST(pl.order_id AS TEXT) = $${paramIndex} OR pl.descripcion ILIKE '%' || $${paramIndex} || '%' OR c.name ILIKE '%' || $${paramIndex} || '%')`;
      searchParams.push(term);
      paramIndex++;
    }
    if (searchDate && searchDate.trim()) {
      searchCondition += ` AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') = $${paramIndex}`;
      searchParams.push(searchDate.trim());
      paramIndex++;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(DISTINCT TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD')) as total FROM print_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10);

    const rows = await db.getAll(`SELECT TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as log_date, COUNT(*) as total_logs, BOOL_AND(pl.completado = TRUE) as all_completed FROM print_logs pl LEFT JOIN orders o ON pl.order_id = o.id LEFT JOIN clients c ON o.client_id = c.id WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') < $1 ${searchCondition} GROUP BY log_date ORDER BY log_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    return { data: rows.map((r) => ({ log_date: r.log_date, total_logs: parseInt(String(r.total_logs), 10), all_completed: r.all_completed === true })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }, searchTerm, searchDate };
  }

  async getByDay(dateLocalStr: string) {
    const rows = await db.getAll<PrintLogRow>(`${this._selectQuery} WHERE pl.active = TRUE AND TO_CHAR(pl.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') = $1 ORDER BY pl.hora_entrega ASC`, [dateLocalStr]);
    return rows.map((r) => new PrintLog(r));
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE print_logs SET active = FALSE WHERE id = $1 AND active = TRUE`, [id]);
    return (result.changes ?? 0) > 0;
  }
}

export default new PrintLogRepository();
