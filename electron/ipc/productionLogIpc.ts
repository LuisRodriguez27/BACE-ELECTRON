import { ipcMain } from 'electron';
import productionLogService from '../services/productionLogService';
import type { ProductionLogData, ProductionLogCheckboxData } from '../types/productionLog';

export function registerProductionLogIpc(): void {
  ipcMain.handle('productionLogs:getActive', async () =>
    await productionLogService.getActiveProductionLogs()
  );
  ipcMain.handle(
    'productionLogs:getPaginated',
    async (_event, page: number, limit: number, searchTerm: string, searchDate: string | null) =>
      await productionLogService.getProductionLogsPaginated(page, limit, searchTerm, searchDate)
  );
  ipcMain.handle(
    'productionLogs:getHistoryDays',
    async (
      _event,
      todayLocalStr: string,
      page: number,
      limit: number,
      searchTerm: string,
      searchDate: string | null
    ) =>
      await productionLogService.getProductionLogsHistoryDays(
        todayLocalStr,
        page,
        limit,
        searchTerm,
        searchDate
      )
  );
  ipcMain.handle('productionLogs:getByDay', async (_event, dateLocalStr: string) =>
    await productionLogService.getProductionLogsByDay(dateLocalStr)
  );
  ipcMain.handle('productionLogs:getById', async (_event, id: number) =>
    await productionLogService.getProductionLogById(id)
  );
  ipcMain.handle('productionLogs:getByOrderId', async (_event, orderId: number) =>
    await productionLogService.getProductionLogsByOrderId(orderId)
  );
  ipcMain.handle('productionLogs:create', async (_event, data: ProductionLogData) =>
    await productionLogService.createProductionLog(data)
  );
  ipcMain.handle('productionLogs:update', async (_event, id: number, data: ProductionLogData) =>
    await productionLogService.updateProductionLog(id, data)
  );
  ipcMain.handle(
    'productionLogs:updateCheckboxes',
    async (_event, id: number, data: ProductionLogCheckboxData) =>
      await productionLogService.updateProductionLogCheckboxes(id, data)
  );
  ipcMain.handle('productionLogs:delete', async (_event, id: number) =>
    await productionLogService.deleteProductionLog(id)
  );
}
