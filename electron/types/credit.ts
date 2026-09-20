/**
 * Tipos del agregado Credit (Crédito / cuenta corriente de cliente).
 * Espeja domain/credit.ts y domain/creditItem.ts.
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type CreditStatus = 'open' | 'closed';
export type CreditSourceType = 'manual' | 'order' | 'simple_order';
export type CreditPaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface CreditRow {
  id: number;
  client_id: number;
  opened_at: string;
  closing_date: string | null;
  status: CreditStatus;
  notes: string | null;
  created_by: number;
  active: boolean;
  /** Joined desde clients */
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  /** Joined desde users */
  created_by_username: string | null;
}

export interface CreditItemRow {
  id: number;
  credit_id: number;
  order_id: number | null;
  simple_order_id: number | null;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_by: number;
  edited_by: number | null;
  active: boolean;
  /** Joined desde la orden de origen, sólo para trazabilidad. */
  source_client_name?: string | null;
  source_client_phone?: string | null;
  source_total?: number | null;
  created_by_username?: string | null;
  edited_by_username?: string | null;
}

export interface CreditPaymentRow {
  id: number;
  credit_id: number;
  cash_session_id: number | null;
  created_by: number | null;
  amount: number;
  date: string;
  descripcion: string | null;
  info: string | null;
  client_name: string | null;
  phone: string | null;
  created_by_username?: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface CreditItemInput {
  order_id?: number | string | null;
  simple_order_id?: number | string | null;
  date: string;
  product: string;
  quantity?: number | string;
  unit_price: number | string;
  total: number | string;
  created_by: number | string;
}

export interface CreateCreditData {
  client_id: number | string;
  created_by: number | string;
  notes?: string | null;
  initial_item: CreditItemInput;
}

export interface AddCreditItemData extends CreditItemInput {
  credit_id: number | string;
}

export interface UpdateCreditItemData {
  date?: string;
  product?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total?: number | string;
  edited_by: number | string;
}

export interface AddCreditPaymentData {
  credit_id: number | string;
  created_by: number | string;
  amount: number | string;
  date: string;
  payment_method: CreditPaymentMethod;
  info?: string | null;
}

export interface CloseCreditData {
  notes?: string | null;
}

export interface CreditFilters {
  searchTerm?: string;
  status?: CreditStatus | 'all';
  /** Rango aplicado a la fecha de apertura del crédito (YYYY-MM-DD). */
  from?: string | null;
  to?: string | null;
}

export interface CreditStatementParams {
  from?: string | null;
  to: string;
}

export interface CreditSourceSearchResult {
  source_type: Exclude<CreditSourceType, 'manual'>;
  id: number;
  date: string;
  product: string;
  client_name: string | null;
  client_phone: string | null;
  total: number;
  paid: number;
  credited: number;
  available: number;
}
