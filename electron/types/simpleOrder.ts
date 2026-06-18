/**
 * Tipos del agregado SimpleOrder (Orden rápida).
 * Espeja domain/simpleOrder.ts + domain/simpleOrderPayment.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface SimpleOrderRow {
  id: number;
  user_id: number;
  date: string;
  concept: string;
  total: number;
  active: boolean;
  client_name: string;
  client_phone: string;
  /** Joined desde users */
  user_username: string | null;
}

export interface SimpleOrderPaymentRow {
  id: number;
  simple_order_id: number;
  user_id: number;
  amount: number;
  date: string;
  descripcion: string | null;
  cash_session_id?: number | null;
  /** Joined desde users */
  user_username: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SimpleOrderData {
  user_id?: number;
  date?: string;
  concept?: string;
  total?: number;
  active?: boolean;
  client_name?: string | null;
  client_phone?: string | null;
}

export interface AddSimplePaymentData {
  simple_order_id: number;
  user_id: number;
  amount: number;
  date?: string;
  descripcion?: string | null;
}

export interface UpdateSimplePaymentData {
  amount: number;
  date: string;
  descripcion?: string | null;
}

