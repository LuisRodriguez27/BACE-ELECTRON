import { ipcMain } from 'electron';
import shoppingListService from '../services/shoppingListService';
import type { OpenShoppingListData, CloseShoppingListData, AddShoppingListItemData, UpdateShoppingListItemData } from '../types/shoppingList';

export function registerShoppingListIpc(): void {
  ipcMain.handle('shoppingList:getActive', async () => await shoppingListService.getActive());
  ipcMain.handle('shoppingList:getById', async (_event, id: number) => await shoppingListService.getById(id));
  ipcMain.handle('shoppingList:getHistory', async (_event, page: number, limit: number) => await shoppingListService.getHistory(page, limit));
  ipcMain.handle('shoppingList:open', async (_event, data: OpenShoppingListData) => await shoppingListService.open(data));
  ipcMain.handle('shoppingList:close', async (_event, id: number, data: CloseShoppingListData) => await shoppingListService.close(id, data));
  ipcMain.handle('shoppingList:addItem', async (_event, data: AddShoppingListItemData) => await shoppingListService.addItem(data));
  ipcMain.handle('shoppingList:updateItem', async (_event, id: number, data: UpdateShoppingListItemData) => await shoppingListService.updateItem(id, data));
  ipcMain.handle('shoppingList:removeItem', async (_event, id: number) => await shoppingListService.removeItem(id));
}
