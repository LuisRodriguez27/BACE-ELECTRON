// ── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

// ── ShoppingListItem ──────────────────────────────────────────────────────────

export interface ShoppingListItem {
  id: number;
  shopping_list_id: number;
  product_id: number;
  quantity: number;
  purchased: boolean;
  created_by: number | null;
  active: boolean;
  product_name: string | null;
}

// ── ShoppingList ──────────────────────────────────────────────────────────────

export type ShoppingListStatus = 'open' | 'closed';

export interface ShoppingList {
  id: number;
  opening_date: string;
  closing_date: string | null;
  status: ShoppingListStatus;
  notes: string | null;
  created_by: number | null;
  items: ShoppingListItem[];
}

// ── Forms ─────────────────────────────────────────────────────────────────────

export interface OpenShoppingListForm {
  notes?: string;
}

export interface CloseShoppingListForm {
  notes?: string;
}

export interface AddShoppingListItemForm {
  product_id: number;
  quantity: number;
}

export interface UpdateShoppingListItemForm {
  quantity?: number;
  purchased?: boolean;
}
