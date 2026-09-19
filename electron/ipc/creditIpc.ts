import { ipcMain } from 'electron';
import creditService from '../services/creditService';
import type {
  AddCreditItemData,
  AddCreditPaymentData,
  CloseCreditData,
  CreateCreditData,
  CreditFilters,
  CreditStatementParams,
  CreditSourceType,
  UpdateCreditItemData,
} from '../types/credit';

export function registerCreditIpc(): void {
  ipcMain.handle('credits:getAll', async (_event, page: number, limit: number, filters: CreditFilters) =>
    await creditService.getAll(page, limit, filters));
  ipcMain.handle('credits:getById', async (_event, id: number) => await creditService.getById(id));
  ipcMain.handle('credits:getOpenByClientId', async (_event, clientId: number) => await creditService.getOpenByClientId(clientId));
  ipcMain.handle('credits:create', async (_event, data: CreateCreditData) => await creditService.create(data));
  ipcMain.handle('credits:addItem', async (_event, data: AddCreditItemData) => await creditService.addItem(data));
  ipcMain.handle('credits:updateItem', async (_event, id: number, data: UpdateCreditItemData) => await creditService.updateItem(id, data));
  ipcMain.handle('credits:removeItem', async (_event, id: number) => await creditService.removeItem(id));
  ipcMain.handle('credits:addPayment', async (_event, data: AddCreditPaymentData) => await creditService.addPayment(data));
  ipcMain.handle('credits:updateNotes', async (_event, id: number, notes: string | null) => await creditService.updateNotes(id, notes));
  ipcMain.handle('credits:close', async (_event, id: number, data: CloseCreditData) => await creditService.close(id, data));
  ipcMain.handle('credits:reopen', async (_event, id: number) => await creditService.reopen(id));
  ipcMain.handle('credits:getStatement', async (_event, id: number, params: CreditStatementParams) => await creditService.getStatement(id, params));
  ipcMain.handle('credits:searchSources', async (_event, searchTerm: string, limit: number, sourceType?: Exclude<CreditSourceType, 'manual'>) => await creditService.searchAvailableSources(searchTerm, limit, sourceType));
}
