import { ipcMain } from 'electron';
import statsService from '../services/statsService';
import type { SalesStatsParams } from '../types/stats';

export function registerStatsIpc(): void {
  ipcMain.handle('stats:getSales', async (_event, params: SalesStatsParams) => await statsService.getSalesStats(params));
  ipcMain.handle('stats:getProducts', async () => await statsService.getProducts());
  ipcMain.handle('stats:getYears', async () => await statsService.getAvailableYears());
  ipcMain.handle('stats:getWeeks', async (_event, year: number) => await statsService.getAvailableWeeks(year));
}
