import { ipcMain } from 'electron';
import expensesService from '../services/expensesService';
import type { CreateExpenseData, UpdateExpenseData } from '../types/expense';

export function registerExpensesIpc(): void {
  ipcMain.handle('expenses:getAll', async (_event, page: number, limit: number) => await expensesService.getAll(page, limit));
  ipcMain.handle('expenses:getByCashSession', async (_event, cashSessionId: number) => await expensesService.getByCashSession(cashSessionId));
  ipcMain.handle('expenses:getById', async (_event, id: number) => await expensesService.getById(id));
  ipcMain.handle('expenses:create', async (_event, data: CreateExpenseData) => await expensesService.create(data));
  ipcMain.handle('expenses:update', async (_event, id: number, data: UpdateExpenseData) => await expensesService.update(id, data));
  ipcMain.handle('expenses:delete', async (_event, id: number) => await expensesService.delete(id));
}
