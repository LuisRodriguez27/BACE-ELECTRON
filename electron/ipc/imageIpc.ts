import { ipcMain } from 'electron';
import imageService from '../services/imageService';

export function registerImageIpc(): void {
  ipcMain.handle('upload-image', async (_event, productId: number, buffer: Buffer, originalName: string) =>
    await imageService.uploadImage(productId, buffer, originalName));
  ipcMain.handle('delete-image', async (_event, relativePath: string) =>
    await imageService.deleteImage(relativePath));
}
