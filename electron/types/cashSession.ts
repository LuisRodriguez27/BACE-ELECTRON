/**
 * Tipos del agregado CashSession (Sesión de caja).
 * Espeja domain/cashSession.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type CashSessionStatus = 'open' | 'closed';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface CashSessionRow {
  id: number;
  opening_date: string;
  closing_date: string | null;
  opening_balance: number;
  expected_balance: number;
  closing_balance: number;
  status: CashSessionStatus;
  notes: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface OpenSessionData {
  opening_balance?: number | string;
  notes?: string | null;
}

export interface CloseSessionData {
  closing_balance?: number | string;
  notes?: string | null;
}
