/**
 * Tipos del agregado Note (Bloc de Notas).
 * Espeja domain/note.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export type NoteStatus = 'Pendiente' | 'Resuelta' | 'Archivada';

export interface NoteRow {
  id: number;
  created_by: number;
  edited_by: number;
  client: string | null;
  phone: string | null;
  text: string | null;
  date: string;
  status: NoteStatus;
  active: boolean;
  created_by_username?: string | null;
  edited_by_username?: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface CreateNoteData {
  created_by: number;
  client?: string | null;
  phone?: string | null;
  text?: string | null;
  date: string;
  status?: NoteStatus;
}

export interface UpdateNoteData {
  client?: string | null;
  phone?: string | null;
  text?: string | null;
  date?: string;
  status?: NoteStatus;
  edited_by: number | string;
}

export interface ArchiveNotesData {
  ids: (number | string)[];
  edited_by: number | string;
}
