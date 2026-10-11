import { ipcMain } from 'electron';
import permissionService from '../services/permissionService';
import type { CreatePermissionData, UpdatePermissionData, AssignPermissionData } from '../types/permission';

export function registerPermissionIpc(): void {
  ipcMain.handle('permissions:getAll', async () => await permissionService.getAllPermissions());
  ipcMain.handle('permissions:getById', async (_event, id: number) => await permissionService.getPermissionById(id));
  ipcMain.handle('permissions:getByUserId', async (_event, userId: number) => await permissionService.getPermissionsByUserId(userId));
  ipcMain.handle('permissions:create', async (_event, data: CreatePermissionData) => await permissionService.createPermission(data));
  ipcMain.handle('permissions:update', async (_event, id: number, data: UpdatePermissionData) => await permissionService.updatePermission(id, data));
  ipcMain.handle('permissions:delete', async (_event, id: number) => await permissionService.deletePermission(id));
  ipcMain.handle('permissions:assignToUser', async (_event, data: AssignPermissionData) => await permissionService.assignPermissionToUser(data));
  ipcMain.handle('permissions:removeFromUser', async (_event, data: AssignPermissionData) => await permissionService.removePermissionFromUser(data));
}
