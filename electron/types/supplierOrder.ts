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
  item_data: string | Record<string, any>;
  active?: boolean | number;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface SupplierOrderData {
  supplier_id?: number;
  order_id?: number | null;
  user_id?: number | null;
  status?: string | null;
  notes?: string | null;
  date?: string;
  items?: Record<string, any>[] | null;
  total?: number | null;
}
