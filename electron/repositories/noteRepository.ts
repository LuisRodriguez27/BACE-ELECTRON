import db from '../db';
import Note from '../domain/note';
import type { NoteRow, NoteStatus } from '../types/note';

class NoteRepository {
  async getAll(page = 1, limit = 20, status?: NoteStatus) {
    const offset = (page - 1) * limit;
    const where = status ? `n.active = TRUE AND n.status = $3` : `n.active = TRUE`;
    const params = status ? [limit, offset, status] : [limit, offset];
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM notes WHERE ${status ? 'active = TRUE AND status = $1' : 'active = TRUE'}`, status ? [status] : []),
      db.getAll<NoteRow>(`SELECT n.*, u.username AS created_by_username, ue.username AS edited_by_username FROM notes n LEFT JOIN users u ON n.created_by = u.id LEFT JOIN users ue ON n.edited_by = ue.id WHERE ${where} ORDER BY n.date DESC LIMIT $1 OFFSET $2`, params),
    ]);
    const total = parseInt(countRow!.total, 10);
    return {
      data: rows.map((r) => new Note(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async getById(id: number) {
    const row = await db.getOne<NoteRow>(`SELECT n.*, u.username AS created_by_username, ue.username AS edited_by_username FROM notes n LEFT JOIN users u ON n.created_by = u.id LEFT JOIN users ue ON n.edited_by = ue.id WHERE n.id = $1`, [id]);
    if (!row) return null;
    return new Note(row);
  }

  async create({ created_by, client, phone, text, date, status }: { created_by: number; client?: string | null; phone?: string | null; text?: string | null; date: string; status?: NoteStatus }) {
    const row = await db.getOne<{ id: number }>(`INSERT INTO notes (created_by, edited_by, client, phone, text, date, status, active) VALUES ($1, $1, $2, $3, $4, $5, COALESCE($6, 'Pendiente'), TRUE) RETURNING *`, [created_by, client || null, phone || null, text || null, date, status || null]);
    return this.getById(row!.id);
  }

  async update(id: number, { client, phone, text, date, status, edited_by }: { client?: string | null; phone?: string | null; text?: string | null; date?: string; status?: NoteStatus; edited_by: number }) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;
    if (client !== undefined) { fields.push(`client = $${idx++}`); values.push(client); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (text !== undefined) { fields.push(`text = $${idx++}`); values.push(text); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
    fields.push(`edited_by = $${idx++}`); values.push(edited_by);
    values.push(id);
    await db.execute(`UPDATE notes SET ${fields.join(', ')} WHERE id = $${idx} AND active = TRUE`, values);
    return this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE notes SET active = FALSE WHERE id = $1 AND active = TRUE`, [id]);
    return (result.changes ?? 0) > 0;
  }

  async archiveMany(ids: number[], edited_by: number): Promise<number> {
    const result = await db.execute(`UPDATE notes SET status = 'Archivada', edited_by = $1 WHERE id = ANY($2::int[]) AND active = TRUE`, [edited_by, ids]);
    return result.changes ?? 0;
  }
}

export default new NoteRepository();
