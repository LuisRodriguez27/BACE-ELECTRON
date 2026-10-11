import { ipcMain } from 'electron';
import authService from '../services/authService';
import { VerifyPasswordData } from '../types/user';

export function registerAuthIpc(): void {
  ipcMain.handle('auth:login', async (_event, data: VerifyPasswordData) =>
    await authService.login(data));
  ipcMain.handle('auth:logout', async () => await authService.logout());
  ipcMain.handle('auth:getCurrentUser', async () => await authService.getCurrentUser());
  ipcMain.handle('auth:isAuthenticated', async () => await authService.isAuthenticated());
  ipcMain.handle('auth:getUserWithPermissions', async () => await authService.getUserWithPermissions());
  ipcMain.handle('auth:requireAuth', async () => await authService.requireAuth());
}
