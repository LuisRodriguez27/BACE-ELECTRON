/**
 * Tipos del agregado SupplierOrder (Orden de proveedor).
 * Espeja domain/supplierOrder.ts + domain/supplierOrderItem.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type SupplierOrderStatus = 'pendiente' | 'pagado' | 'cancelado';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface SupplierOrderRow {
  id: number;
  supplier_id: number;
  order_id: number | null;
  user_id: number | null;
  status: SupplierOrderStatus | null;
  notes: string | null;
  date: string;
  total: number;
  active: boolean;
  /** Joined desde suppliers */
  supplier_name: string | null;
  supplier_phone: string | null;
  /** Joined desde orders */
  order_total: number | null;
  /** Joined desde users */
  username: string | null;
}

export interface SupplierOrderItemRow {
  id: number;
  supplier_order_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  [key: string]: unknown;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SupplierOrderData {
  supplier_id?: number | string;
  order_id?: number | string | null;
  user_id?: number | string | null;
  status?: string | null;
  notes?: string | null;
  date?: string;
  items?: unknown[] | null;
  total?: number | string | null;
  [key: string]: unknown;
}
