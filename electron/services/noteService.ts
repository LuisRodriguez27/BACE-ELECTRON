import noteRepository from '../repositories/noteRepository';
import type { CreateNoteData, UpdateNoteData, ArchiveNotesData, NoteStatus } from '../types/note';

const VALID_STATUSES: NoteStatus[] = ['Pendiente', 'Resuelta', 'Archivada'];

class NoteService {
  async getAll(page = 1, limit = 20, status?: NoteStatus) {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20;
      if (status !== undefined && !VALID_STATUSES.includes(status)) throw new Error('Status de la nota inválido');
      const result = await noteRepository.getAll(page, limit, status);
      return { data: result.data.map((n) => n.toPlainObject()), pagination: result.pagination };
    } catch (error) {
      console.error('Error al obtener notas:', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de nota inválido');
      const note = await noteRepository.getById(id);
      if (!note) throw new Error('Nota no encontrada');
      return note.toPlainObject();
    } catch (error) {
      console.error('Error al obtener nota:', error);
      throw error;
    }
  }

  async create(data: CreateNoteData) {
    try {
      const { created_by, client, phone, text, date, status } = data;
      if (!created_by || isNaN(Number(created_by))) throw new Error('ID de usuario creador inválido');
      if (!date) throw new Error('La fecha de la nota es requerida');
      if (isNaN(new Date(date).getTime())) throw new Error('Fecha de la nota inválida');
      if (status !== undefined && !VALID_STATUSES.includes(status)) throw new Error('Status de la nota inválido');

      const note = await noteRepository.create({ created_by: parseInt(String(created_by)), client: client?.trim() || null, phone: phone?.trim() || null, text: text?.trim() || null, date, status });
      if (!note) throw new Error('Error al crear nota');
      return note.toPlainObject();
    } catch (error) {
      console.error('Error al crear nota:', error);
      throw error;
    }
  }

  async update(id: number, data: UpdateNoteData) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de nota inválido');
      if (data.edited_by === undefined || isNaN(Number(data.edited_by))) throw new Error('ID de usuario editor inválido');

      const payload: { client?: string | null; phone?: string | null; text?: string | null; date?: string; status?: NoteStatus; edited_by: number } = {
        edited_by: parseInt(String(data.edited_by)),
      };
      if (data.client !== undefined) payload.client = data.client?.trim() || null;
      if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
      if (data.text !== undefined) payload.text = data.text?.trim() || null;
      if (data.date !== undefined) {
        if (isNaN(new Date(data.date).getTime())) throw new Error('Fecha inválida');
        payload.date = data.date;
      }
      if (data.status !== undefined) {
        if (!VALID_STATUSES.includes(data.status)) throw new Error('Status de la nota inválido');
        payload.status = data.status;
      }

      const note = await noteRepository.update(id, payload);
      if (!note) throw new Error('Nota no encontrada o ya inactiva');
      return note.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      throw error;
    }
  }

  async delete(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de nota inválido');
      const deleted = await noteRepository.delete(id);
      if (!deleted) throw new Error('Nota no encontrada o ya eliminada');
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      throw error;
    }
  }

  async archiveMany(data: ArchiveNotesData) {
    try {
      if (!Array.isArray(data.ids) || data.ids.length === 0) throw new Error('Debes seleccionar al menos una nota');
      const ids = data.ids.map((id) => parseInt(String(id)));
      if (ids.some((id) => isNaN(id) || id <= 0)) throw new Error('Hay un ID de nota inválido en la selección');
      if (data.edited_by === undefined || isNaN(Number(data.edited_by))) throw new Error('ID de usuario editor inválido');

      const archived = await noteRepository.archiveMany(ids, parseInt(String(data.edited_by)));
      return { archived };
    } catch (error) {
      console.error('Error al archivar notas:', error);
      throw error;
    }
  }
}

export default new NoteService();
