/**
 * Tipos del agregado ShoppingList (Lista de compras).
 * Espeja domain/shoppingList.ts y domain/shoppingListItem.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type ShoppingListStatus = 'open' | 'closed';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface ShoppingListRow {
  id: number;
  opening_date: string;
  closing_date: string | null;
  status: ShoppingListStatus;
  notes: string | null;
  created_by: number | null;
}

export interface ShoppingListItemRow {
  id: number;
  shopping_list_id: number;
  product_id: number;
  quantity: number;
  purchased: boolean;
  created_by: number | null;
  active: boolean;
  order_id: number | null;
  /** Joined desde products */
  product_name?: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface OpenShoppingListData {
  notes?: string | null;
  created_by?: number | string | null;
}

export interface CloseShoppingListData {
  notes?: string | null;
}

export interface AddShoppingListItemData {
  product_id: number | string;
  quantity: number | string;
  created_by?: number | string | null;
  order_id?: number | string | null;
}

export interface UpdateShoppingListItemData {
  quantity?: number | string;
  purchased?: boolean;
}
