import { ipcMain } from 'electron';
import productService from '../services/productService';
import type { ProductData } from '../types/product';

export function registerProductIpc(): void {
  ipcMain.handle('products:getAll', async () => await productService.getAllProducts());
  ipcMain.handle('products:getById', async (_event, id: number) => await productService.getProductById(id));
  ipcMain.handle('products:create', async (_event, data: ProductData) => await productService.createProduct(data));
  ipcMain.handle('products:update', async (_event, id: number, data: ProductData) => await productService.updateProduct(id, data));
  ipcMain.handle('products:delete', async (_event, id: number) => await productService.deleteProduct(id));
  ipcMain.handle('products:getWithTemplates', async (_event, productId: number) => await productService.getProductWithTemplates(productId));
  ipcMain.handle('products:getAllWithTemplates', async () => await productService.getAllProductsWithTemplates());
  ipcMain.handle('products:search', async (_event, searchTerm: string) => await productService.searchProducts(searchTerm));
  ipcMain.handle('products:searchWithTemplates', async (_event, searchTerm: string) => await productService.searchProductsWithTemplates(searchTerm));
  ipcMain.handle('products:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
    await productService.getProductsPaginated(page, limit, searchTerm));
  ipcMain.handle('products:findSimilarNames', async () => await productService.getProductsWithSimilarNames());
}
