import { ipcMain } from 'electron';
import clientService from '../services/clientService';
import type { ClientData } from '../types/client';

export function registerClientIpc(): void {
  ipcMain.handle('clients:getAll', async () => await clientService.getAllClients());
  ipcMain.handle('clients:getAllInvested', async () => await clientService.getAllInvestedClients());
  ipcMain.handle('clients:getById', async (_event, id: number) => await clientService.getClientById(id));
  ipcMain.handle('clients:create', async (_event, data: ClientData) => await clientService.createClient(data));
  ipcMain.handle('clients:update', async (_event, id: number, data: ClientData) => await clientService.updateClient(id, data));
  ipcMain.handle('clients:delete', async (_event, id: number) => await clientService.deleteClient(id));
  ipcMain.handle('clients:search', async (_event, searchTerm: string) => await clientService.searchClients(searchTerm));
  ipcMain.handle('clients:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await clientService.getClientsPaginated(page, limit, searchTerm));
}
