import { ipcMain } from 'electron';
import supplierOrderService from '../services/supplierOrderService';
import type { SupplierOrderData } from '../types/supplierOrder';

export function registerSupplierOrderIpc(): void {
  ipcMain.handle('supplierOrders:getAll', async () => await supplierOrderService.getAllSupplierOrders());
  ipcMain.handle('supplierOrders:getById', async (_event, id: number) => await supplierOrderService.getSupplierOrderById(id));
  ipcMain.handle('supplierOrders:getBySupplierId', async (_event, supplierId: number) => await supplierOrderService.getSupplierOrdersBySupplierId(supplierId));
  ipcMain.handle('supplierOrders:getByOrderId', async (_event, orderId: number) => await supplierOrderService.getSupplierOrdersByOrderId(orderId));
  ipcMain.handle('supplierOrders:create', async (_event, data: SupplierOrderData) => await supplierOrderService.createSupplierOrder(data));
  ipcMain.handle('supplierOrders:update', async (_event, id: number, data: SupplierOrderData) => await supplierOrderService.updateSupplierOrder(id, data));
  ipcMain.handle('supplierOrders:delete', async (_event, id: number) => await supplierOrderService.deleteSupplierOrder(id));
  ipcMain.handle('supplierOrders:getPreviousItems', async (_event, supplierId: number) => await supplierOrderService.getPreviousItemsBySupplier(supplierId));
}
