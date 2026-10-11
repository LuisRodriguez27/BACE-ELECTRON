import { ipcMain } from 'electron';
import cashSessionService from '../services/cashSessionService';
import type { OpenSessionData, CloseSessionData } from '../types/cashSession';

export function registerCashSessionIpc(): void {
  ipcMain.handle('cashSessions:getAll', async (_event, page: number, limit: number) => await cashSessionService.getAll(page, limit));
  ipcMain.handle('cashSessions:getClosed', async (_event, page: number, limit: number) => await cashSessionService.getClosed(page, limit));
  ipcMain.handle('cashSessions:getActive', async () => await cashSessionService.getActive());
  ipcMain.handle('cashSessions:getById', async (_event, id: number) => await cashSessionService.getById(id));
  ipcMain.handle('cashSessions:getByDateRange', async (_event, from: string, to: string) => await cashSessionService.getByDateRange(from, to));
  ipcMain.handle('cashSessions:getSummary', async (_event, id: number) => await cashSessionService.getSummary(id));
  ipcMain.handle('cashSessions:open', async (_event, data: OpenSessionData) => await cashSessionService.open(data));
  ipcMain.handle('cashSessions:close', async (_event, id: number, data: CloseSessionData) => await cashSessionService.close(id, data));
  ipcMain.handle('cashSessions:update', async (_event, id: number, data: OpenSessionData) => await cashSessionService.update(id, data));
  ipcMain.handle('cashSessions:reopen', async (_event, id: number) => await cashSessionService.reopen(id));
}
