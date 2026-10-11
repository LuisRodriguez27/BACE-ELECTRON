/**
 * Tipos del agregado Client.
 * Espeja domain/client.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface ClientRow {
  id: number;
  name: string;
  phone: string | null;
  color: string | null;
  active: boolean;
  /** Total invertido (campo calculado usado en getAllInvested). */
  total_invested?: number | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface ClientData {
  name: string;
  phone: string;
  address?: string;
  description?: string;
  color?: string;
}
