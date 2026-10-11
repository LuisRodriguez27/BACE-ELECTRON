/**
 * Tipos del contexto Stats.
 * No tiene entidad de dominio propia — son parámetros de consulta del IPC.
 */

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SalesStatsParams {
  period?: string;
  productId?: number | null;
  customStartDate?: string;
  customEndDate?: string;
  month?: number;
  year?: number;
  dates?: string[];
  paymentMethod?: string | null;
  source?: string;
}
