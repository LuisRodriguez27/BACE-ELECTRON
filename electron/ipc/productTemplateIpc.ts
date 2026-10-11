import { ipcMain } from 'electron';
import productTemplatesService from '../services/productTemplateService';
import type { TemplateData } from '../types/productTemplate';

export function registerProductTemplateIpc(): void {
  ipcMain.handle('templates:getAll', async () => await productTemplatesService.getAllTemplates());
  ipcMain.handle('templates:getById', async (_event, id: number) => await productTemplatesService.getTemplateById(id));
  ipcMain.handle('templates:getByProductId', async (_event, productId: number) => await productTemplatesService.getTemplatesByProductId(productId));
  ipcMain.handle('templates:create', async (_event, data: TemplateData) => await productTemplatesService.createTemplate(data));
  ipcMain.handle('templates:update', async (_event, id: number, data: Omit<TemplateData, 'created_by'>) => await productTemplatesService.updateTemplate(id, data));
  ipcMain.handle('templates:delete', async (_event, id: number) => await productTemplatesService.deleteTemplate(id));
  ipcMain.handle('templates:search', async (_event, searchTerm: string) => await productTemplatesService.searchTemplates(searchTerm));
  ipcMain.handle('templates:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await productTemplatesService.getTemplatesPaginated(page, limit, searchTerm));
}
