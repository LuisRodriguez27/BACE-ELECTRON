/**
 * Tipos del agregado ProductionLog (Bitácora de producción).
 * Espeja domain/productionLog.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type ProductionLogResponsable = 'most' | 'maq';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface ProductionLogRow {
  id: number;
  order_id: number | null;
  created_by: number | null;
  delivery_at: string;
  cantidad: number;
  descripcion: string;
  responsable: ProductionLogResponsable;
  completado: boolean | number | string;
  created_at: string | null;
  active: boolean;
  /** Joined desde orders > clients */
  client_name: string | null;
  /** Joined desde users */
  creator_name: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface ProductionLogData {
  order_id?: number | string | null;
  created_by?: number | string | null;
  delivery_at?: string;
  cantidad?: number | string;
  descripcion?: string;
  responsable?: string;
  completado?: boolean | string | number;
  created_at?: string | null;
}

export interface ProductionLogCheckboxData {
  completado: boolean | undefined;
}
