import { ipcMain } from 'electron';
import budgetService from '../services/budgetService';
import type { BudgetData } from '../types/budget';

export function registerBudgetIpc(): void {
  ipcMain.handle('budgets:getAll', async () => await budgetService.getAllBudgets());
  ipcMain.handle('budgets:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await budgetService.getBudgetsPaginated(page, limit, searchTerm));
  ipcMain.handle('budgets:search', async (_event, page: number, limit: number, searchTerm: string) =>
    await budgetService.getBudgetsPaginated(page, limit, searchTerm));
  ipcMain.handle('budgets:getById', async (_event, id: number) => await budgetService.getBudgetById(id));
  ipcMain.handle('budgets:getByClientId', async (_event, clientId: number) => await budgetService.getBudgetByClientId(clientId));
  ipcMain.handle('budgets:create', async (_event, data: BudgetData) => await budgetService.createBudget(data));
  ipcMain.handle('budgets:update', async (_event, id: number, data: BudgetData) => await budgetService.updateBudget(id, data));
  ipcMain.handle('budgets:delete', async (_event, id: number) => await budgetService.deleteBudget(id));
  ipcMain.handle('budgets:getProducts', async (_event, budgetId: number) => await budgetService.getBudgetProducts(budgetId));
  ipcMain.handle('budgets:recalculateTotal', async (_event, budgetId: number) => await budgetService.recalculateBudgetTotal(budgetId));
  ipcMain.handle('budgets:transformToOrder', async (_event, budgetId: number, userId: number) =>
    await budgetService.transformToOrder(budgetId, userId));
  ipcMain.handle('budgets:getNextId', async () => await budgetService.getNextId());
}
