/**
 * Tipos del agregado Order.
 * Espeja domain/order.ts
 */

// ─── Value objects / Enums ─────────────────────────────────────────────────

export type OrderStatus =
  | 'Revision'
  | 'Diseño'
  | 'Produccion'
  | 'Entrega'
  | 'Completado'
  | 'Cancelado';

export type OrderResponsable = 'Mostrador' | 'Maquila';

// ─── Row types ─────────────────────────────────────────────────────────────

export interface OrderRow {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  estimated_delivery_date: string | null;
  status: OrderStatus;
  responsable: OrderResponsable | null;
  total: number;
  notes: string | null;
  description: string | null;
  active: boolean;
  /** Joined desde clients */
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  /** Joined desde users */
  user_username: string | null;
  edited_by_username: string | null;
}

export interface OrderProductRow {
  id: number;
  order_id: number;
  product_id: number | null;
  template_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_delivered: boolean;
  is_paid: boolean;
  /** Joined desde products (producto directo) */
  product_name: string | null;
  serial_number: string | null;
  product_price: number | null;
  product_description: string | null;
  /** Joined desde product_templates */
  template_width: number | null;
  template_height: number | null;
  template_colors: string | null;
  template_position: string | null;
  template_texts: string | null;
  template_description: string | null;
  template_final_price: number | null;
  template_created_by_username: string | null;
  /** Nombre del producto base de la plantilla */
  template_base_product_name: string | null;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface OrderItem {
  product_id?: number | null;
  template_id?: number | null;
  quantity: number;
  unit_price: number;
  is_delivered?: boolean;
  is_paid?: boolean;
}

export interface OrderData {
  client_id?: number;
  user_id?: number;
  date?: string;
  estimated_delivery_date?: string | null;
  status?: string;
  responsable?: string | null;
  notes?: string | null;
  description?: string | null;
  edited_by?: number | null;
  items?: OrderItem[];
  /** @deprecated Usar `items` en su lugar */
  products?: Array<{
    product_id?: number | null;
    template_id?: number | null;
    quantity: number;
    unit_price?: number;
  }>;
}
