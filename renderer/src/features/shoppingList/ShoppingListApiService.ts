import type {
  ShoppingList,
  ShoppingListItem,
  OpenShoppingListForm,
  CloseShoppingListForm,
  AddShoppingListItemForm,
  UpdateShoppingListItemForm,
  PaginatedResult,
} from './types';

export const ShoppingListApiService = {
  getActive: (): Promise<ShoppingList | null> =>
    window.api.getActiveShoppingList(),

  getById: (id: number): Promise<ShoppingList> =>
    window.api.getShoppingListById(id),

  getHistory: (page = 1, limit = 20): Promise<PaginatedResult<ShoppingList>> =>
    window.api.getShoppingListHistory(page, limit),

  open: (data: OpenShoppingListForm): Promise<ShoppingList> =>
    window.api.openShoppingList(data),

  close: (id: number, data: CloseShoppingListForm): Promise<ShoppingList> =>
    window.api.closeShoppingList(id, data),

  addItem: (data: AddShoppingListItemForm): Promise<ShoppingListItem> =>
    window.api.addShoppingListItem(data),

  updateItem: (id: number, data: UpdateShoppingListItemForm): Promise<ShoppingListItem> =>
    window.api.updateShoppingListItem(id, data),

  removeItem: (id: number): Promise<void> =>
    window.api.removeShoppingListItem(id),
};
