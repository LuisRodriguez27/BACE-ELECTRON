import { ipcMain } from 'electron';
import printLogService from '../services/printLogService';
import type { PrintLogData, PrintLogCheckboxData } from '../types/printLog';

export function registerPrintLogIpc(): void {
  ipcMain.handle('printLogs:getActive', async () => await printLogService.getActivePrintLogs());
  ipcMain.handle('printLogs:getPaginated', async (_event, page: number, limit: number, searchTerm: string, searchDate: string | null) =>
    await printLogService.getPrintLogsPaginated(page, limit, searchTerm, searchDate));
  ipcMain.handle('printLogs:getHistoryDays', async (_event, todayLocalStr: string, page: number, limit: number, searchTerm: string, searchDate: string | null) =>
    await printLogService.getPrintLogsHistoryDays(todayLocalStr, page, limit, searchTerm, searchDate));
  ipcMain.handle('printLogs:getByDay', async (_event, dateLocalStr: string) => await printLogService.getPrintLogsByDay(dateLocalStr));
  ipcMain.handle('printLogs:getById', async (_event, id: number) => await printLogService.getPrintLogById(id));
  ipcMain.handle('printLogs:getByOrderId', async (_event, orderId: number) => await printLogService.getPrintLogsByOrderId(orderId));
  ipcMain.handle('printLogs:create', async (_event, data: PrintLogData) => await printLogService.createPrintLog(data));
  ipcMain.handle('printLogs:update', async (_event, id: number, data: PrintLogData) => await printLogService.updatePrintLog(id, data));
  ipcMain.handle('printLogs:updateCheckboxes', async (_event, id: number, data: PrintLogCheckboxData) => await printLogService.updatePrintLogCheckboxes(id, data));
  ipcMain.handle('printLogs:delete', async (_event, id: number) => await printLogService.deletePrintLog(id));
}
