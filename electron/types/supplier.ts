/**
 * Tipos del agregado Supplier (Proveedor).
 * Espeja domain/supplier.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface SupplierRow {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  /** Almacenado como JSON string en la DB, parseado en el constructor. */
  columns: string | string[];
  is_active: boolean;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SupplierData {
  name: string;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  columns?: string[] | string | null;
}
