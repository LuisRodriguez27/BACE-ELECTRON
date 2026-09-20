/**
 * Tipos del agregado Payment.
 * Espeja domain/payments.ts
 */

import type { OrderStatus } from './order';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: number;
  order_id: number | null;
  credit_id: number | null;
  created_by: number | null;
  cash_session_id: number | null;
  amount: number;
  date: string;
  descripcion: string | null;
  info: string | null;
  phone: string | null;
  client_name: string | null;
  is_simple_order?: boolean;
  simple_order_id?: number | null;
  is_credit?: boolean;
  /** Joined desde orders (opcional, si se trae la orden) */
  order?: {
    id: number;
    client_id: number;
    status: OrderStatus;
    total: number;
    client_name: string | null;
    description: string | null;
    notes: string | null;
  } | null;
  /** Joined desde credits (opcional, si es un abono de crédito) */
  credit?: {
    id: number;
    client_id: number;
    status: 'open' | 'closed';
    client_name: string | null;
    client_phone: string | null;
  } | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface CreatePaymentData {
  orderId?: number | null;
  created_by?: number | null;
  amount: number;
  date: string;
  descripcion?: string | null;
  info?: string | null;
  phone?: string | null;
  clientName?: string | null;
}

export interface UpdatePaymentData {
  amount?: number;
  descripcion?: string | null;
  info?: string | null;
  phone?: string | null;
  clientName?: string | null;
}
