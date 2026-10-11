import { ipcMain } from 'electron';
import supplierService from '../services/supplierService';
import type { SupplierData } from '../types/supplier';

export function registerSupplierIpc(): void {
  ipcMain.handle('suppliers:getAll', async () => await supplierService.getAllSuppliers());
  ipcMain.handle('suppliers:getById', async (_event, id: number) => await supplierService.getSupplierById(id));
  ipcMain.handle('suppliers:create', async (_event, data: SupplierData) => await supplierService.createSupplier(data));
  ipcMain.handle('suppliers:update', async (_event, id: number, data: SupplierData) => await supplierService.updateSupplier(id, data));
  ipcMain.handle('suppliers:delete', async (_event, id: number) => await supplierService.deleteSupplier(id));
  ipcMain.handle('suppliers:search', async (_event, searchTerm: string) => await supplierService.searchSuppliers(searchTerm));
}
