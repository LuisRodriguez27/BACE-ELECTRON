/**
 * Tipos del agregado PrintLog (Bitácora de impresión).
 * Espeja domain/printLog.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type PrintLogResponsable = 'most' | 'maq';

export type PrintLogStatus = 'Pendiente' | 'En Proceso' | 'Realizado';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface PrintLogRow {
  id: number;
  order_id: number | null;
  descripcion: string;
  hora_entrega: string;
  responsable: PrintLogResponsable;
  observaciones: string | null;
  envio: string;
  pago: number | null;
  completado: boolean | number | string;
  status: PrintLogStatus;
  created_at: string | null;
  active: boolean;
  /** Joined desde orders > clients */
  client_name: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface PrintLogData {
  order_id?: number | string | null;
  descripcion?: string;
  hora_entrega?: string;
  responsable?: string;
  observaciones?: string | null;
  envio?: string;
  pago?: number | string | null;
  completado?: boolean | string | number;
  status?: string;
  created_at?: string | null;
}

export interface PrintLogCheckboxData {
  completado: boolean | undefined;
}
