import { ipcMain } from 'electron';
import userService from '../services/userService';
import type { CreateUserData, UpdateUserData, VerifyPasswordData } from '../types/user';

export function registerUserIpc(): void {
  ipcMain.handle('users:getAll', async () => await userService.getAllUsers());
  ipcMain.handle('users:getById', async (_event, id: number) => await userService.getUserById(id));
  ipcMain.handle('users:create', async (_event, data: CreateUserData) => await userService.createUser(data));
  ipcMain.handle('users:update', async (_event, id: number, data: UpdateUserData) => await userService.updateUser(id, data));
  ipcMain.handle('users:delete', async (_event, id: number) => await userService.deleteUser(id));
  ipcMain.handle('users:verifyPassword', async (_event, data: VerifyPasswordData) => await userService.verifyPassword(data));
  ipcMain.handle('users:checkUsername', async (_event, username: string, excludeUserId?: number) =>
    await userService.checkUsernameExists(username, excludeUserId));
}
