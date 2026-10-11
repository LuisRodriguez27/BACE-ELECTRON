import { ipcMain } from 'electron';
import noteService from '../services/noteService';
import type { CreateNoteData, UpdateNoteData, ArchiveNotesData, NoteStatus } from '../types/note';

export function registerNoteIpc(): void {
  ipcMain.handle('notes:getAll', async (_event, page: number, limit: number, status?: NoteStatus) => await noteService.getAll(page, limit, status));
  ipcMain.handle('notes:getById', async (_event, id: number) => await noteService.getById(id));
  ipcMain.handle('notes:create', async (_event, data: CreateNoteData) => await noteService.create(data));
  ipcMain.handle('notes:update', async (_event, id: number, data: UpdateNoteData) => await noteService.update(id, data));
  ipcMain.handle('notes:delete', async (_event, id: number) => await noteService.delete(id));
  ipcMain.handle('notes:archiveMany', async (_event, data: ArchiveNotesData) => await noteService.archiveMany(data));
}
