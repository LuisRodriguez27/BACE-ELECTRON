import { ipcMain } from 'electron';
import simpleOrderService from '../services/simpleOrderService';
import type { SimpleOrderData, AddSimplePaymentData, UpdateSimplePaymentData } from '../types/simpleOrder';

export function registerSimpleOrderIpc(): void {
  ipcMain.handle('simpleOrders:getAll', async () => await simpleOrderService.getAllSimpleOrders());
  ipcMain.handle('simpleOrders:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await simpleOrderService.getSimpleOrdersPaginated(page, limit, searchTerm));
  ipcMain.handle('simpleOrders:getById', async (_event, id: number) => await simpleOrderService.getSimpleOrderById(id));
  ipcMain.handle('simpleOrders:create', async (_event, data: SimpleOrderData) => await simpleOrderService.createSimpleOrder(data));
  ipcMain.handle('simpleOrders:update', async (_event, id: number, data: SimpleOrderData) => await simpleOrderService.updateSimpleOrder(id, data));
  ipcMain.handle('simpleOrders:delete', async (_event, id: number) => await simpleOrderService.deleteSimpleOrder(id));
  ipcMain.handle('simpleOrders:addPayment', async (_event, data: AddSimplePaymentData) => await simpleOrderService.addPayment(data));
  ipcMain.handle('simpleOrders:getPayments', async (_event, id: number) => await simpleOrderService.getPayments(id));
  ipcMain.handle('simpleOrders:updatePayment', async (_event, id: number, data: UpdateSimplePaymentData) => await simpleOrderService.updatePayment(id, data));
  ipcMain.handle('simpleOrders:deletePayment', async (_event, id: number) => await simpleOrderService.deletePayment(id));
}
