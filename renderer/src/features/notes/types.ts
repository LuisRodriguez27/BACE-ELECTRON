export type NoteStatus = 'Pendiente' | 'Resuelta' | 'Archivada';

export const NOTE_STATUSES: NoteStatus[] = ['Pendiente', 'Resuelta', 'Archivada'];

export interface Note {
  id: number;
  created_by: number;
  edited_by: number;
  client: string | null;
  phone: string | null;
  text: string | null;
  date: string;
  status: NoteStatus;
  active: boolean;
  created_by_username?: string;
  edited_by_username?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedNotes {
  data: Note[];
  pagination: Pagination;
}

export interface CreateNoteForm {
  created_by: number;
  client?: string | null;
  phone?: string | null;
  text?: string | null;
  date: string;
  status?: NoteStatus;
}

export interface UpdateNoteForm {
  client?: string | null;
  phone?: string | null;
  text?: string | null;
  date?: string;
  status?: NoteStatus;
  edited_by: number;
}

export interface ArchiveNotesForm {
  ids: number[];
  edited_by: number;
}
