/**
 * Tipos del agregado Supplier (Proveedor).
 * Espeja domain/supplier.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

/** Columna personalizada del proveedor (almacenada como JSON en DB). */
export interface SupplierColumn {
  name: string;
  type?: string;
  [key: string]: unknown;
}

export interface SupplierRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  /** Almacenado como JSON string en la DB, parseado en el constructor. */
  columns: string | SupplierColumn[];
  is_active: boolean;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SupplierData {
  name: string;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  columns?: unknown[] | string | null;
}
