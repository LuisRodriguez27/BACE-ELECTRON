import { ipcMain } from 'electron';
import orderService from '../services/orderService';
import type { OrderData } from '../types/order';

export function registerOrderIpc(): void {
  ipcMain.handle('orders:getAll', async () => await orderService.getAllOrders());
  ipcMain.handle('orders:getPendingForLogbook', async () => await orderService.getPendingOrdersForLogbook());
  ipcMain.handle('orders:getById', async (_event, id: number) => await orderService.getOrderById(id));
  ipcMain.handle('orders:getByClientId', async (_event, clientId: number) => await orderService.getOrdersByClientId(clientId));
  ipcMain.handle('orders:create', async (_event, data: OrderData) => await orderService.createOrder(data));
  ipcMain.handle('orders:update', async (_event, id: number, data: OrderData) => await orderService.updateOrder(id, data));
  ipcMain.handle('orders:delete', async (_event, id: number) => await orderService.deleteOrder(id));
  ipcMain.handle('orders:recalculateTotal', async (_event, orderId: number) => await orderService.recalculateOrderTotal(orderId));
  ipcMain.handle('sales:getAll', async () => await orderService.getSales());
  ipcMain.handle('sales:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await orderService.getSalesPaginated(page, limit, searchTerm));
  ipcMain.handle('sales:search', async (_event, page: number, limit: number, searchTerm: string) =>
    await orderService.getSalesPaginated(page, limit, searchTerm));
  ipcMain.handle('orders:getProducts', async (_event, orderId: number) => await orderService.getOrderProducts(orderId));
}
