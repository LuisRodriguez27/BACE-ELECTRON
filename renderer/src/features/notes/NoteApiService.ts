import type { Note, CreateNoteForm, UpdateNoteForm, ArchiveNotesForm, PaginatedNotes, NoteStatus } from './types';

export const NoteApiService = {
  getPaginated: async (page: number, limit: number, status?: NoteStatus): Promise<PaginatedNotes> => {
    return window.api.getNotes(page, limit, status);
  },

  getById: async (id: number): Promise<Note> => {
    return window.api.getNoteById(id);
  },

  create: async (data: CreateNoteForm): Promise<Note> => {
    return window.api.createNote(data);
  },

  update: async (id: number, data: UpdateNoteForm): Promise<Note> => {
    return window.api.updateNote(id, data);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteNote(id);
  },

  archiveMany: async (data: ArchiveNotesForm): Promise<{ archived: number }> => {
    return window.api.archiveNotes(data);
  }
};
