import { ipcMain } from 'electron';
import paymentService from '../services/paymentsService';
import type { CreatePaymentData, UpdatePaymentData } from '../types/payment';
import type { PaymentFilters } from '../repositories/paymentsRepository';

export function registerPaymentIpc(): void {
  ipcMain.handle('payments:getAll', async () => await paymentService.getAllPayments());
  ipcMain.handle('payments:getPaginated', async (_event, page: number, limit: number, filters: PaymentFilters) =>
    await paymentService.getPaymentsPaginated(page, limit, filters));
  ipcMain.handle('payments:getPaymentsByOrderId', async (_event, orderId: number) => await paymentService.getPaymentsByOrderId(orderId));
  ipcMain.handle('payments:getById', async (_event, id: number) => await paymentService.getPaymentById(id));
  ipcMain.handle('payments:create', async (_event, data: CreatePaymentData) => await paymentService.createPayment(data));
  ipcMain.handle('payments:update', async (_event, id: number, data: UpdatePaymentData) => await paymentService.updatePayment(id, data));
  ipcMain.handle('payments:delete', async (_event, id: number) => await paymentService.deletePayment(id));
  ipcMain.handle('payments:getByClientId', async (_event, clientId: number) => await paymentService.getPaymentsByClientId(clientId));
}
