/**
 * Tipos del agregado Budget (Presupuesto).
 * Espeja domain/budget.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface BudgetRow {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  total: number;
  converted_to_order: boolean;
  active: boolean;
  /** Joined desde clients */
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  /** Joined desde users */
  user_username: string | null;
  edited_by_username: string | null;
}

export interface BudgetProductRow {
  id: number;
  budget_id: number;
  product_id: number | null;
  template_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string | null;
  template_description: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface BudgetItem {
  product_id?: number | null;
  template_id?: number | null;
  quantity: number;
  unit_price: number;
}

export interface BudgetData {
  client_id?: number;
  user_id?: number;
  date?: string;
  edited_by?: number | null;
  items?: BudgetItem[];
  /** @deprecated Usar `items` en su lugar */
  products?: Array<{
    product_id?: number | null;
    template_id?: number | null;
    quantity: number;
    unit_price: number;
  }>;
}
