/**
 * Tipos del dominio de BACE-ELECTRON.
 *
 * Contiene:
 *  - Tipos union para estados/enums de negocio.
 *  - Row types: forma exacta de cada fila devuelta por PostgreSQL
 *    (lo que recibe el constructor de cada clase del dominio).
 *
 * Estos tipos son el contrato entre la capa de repositorios (que los
 * produce con db.getOne / db.getAll) y la capa de dominio (que los
 * consume en sus constructores).
 */

// ─── Tipos de estado y enums de negocio ────────────────────────────────────

export type OrderStatus =
  | 'Revision'
  | 'Diseño'
  | 'Produccion'
  | 'Entrega'
  | 'Completado'
  | 'Cancelado';

export type OrderResponsable = 'Mostrador' | 'Maquila';

export type CashSessionStatus = 'open' | 'closed';

export type PrintLogResponsable = 'most' | 'maq';

export type PrintLogStatus = 'Pendiente' | 'En Proceso' | 'Realizado';

export type SupplierOrderStatus = 'pendiente' | 'pagado' | 'cancelado';

// ─── User ──────────────────────────────────────────────────────────────────

export interface UserRow {
  id: number;
  username: string;
  password: string;
  active: boolean;
}

// ─── Permission ────────────────────────────────────────────────────────────

export interface PermissionRow {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

// ─── Session (Auth) ────────────────────────────────────────────────────────

export interface SessionUserData {
  id: number;
  username: string;
  active: boolean;
}

export interface SessionData {
  user?: SessionUserData | null;
  permissions?: string[];
  isActive?: boolean;
}

// ─── Client ────────────────────────────────────────────────────────────────

export interface ClientRow {
  id: number;
  name: string;
  phone: string | null;
  color: string | null;
  active: boolean;
  /** Total invertido (campo calculado usado en getAllInvested). */
  total_invested?: number | null;
}

// ─── Product ───────────────────────────────────────────────────────────────

export interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  discount_price: number | null;
  serial_number: string | null;
  images: string | null;
  active: boolean;
}

// ─── ProductTemplate ───────────────────────────────────────────────────────

export interface ProductTemplateRow {
  id: number;
  product_id: number;
  width: number | null;
  height: number | null;
  colors: string | null;
  position: string | null;
  texts: string | null;
  description: string | null;
  final_price: number | null;
  promo_price: number | null;
  discount_price: number | null;
  created_by: number | null;
  active: boolean;
  /** Joined desde products */
  product_name?: string | null;
  /** Joined desde users */
  created_by_username?: string | null;
}

// ─── Order ─────────────────────────────────────────────────────────────────

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

// ─── Budget ────────────────────────────────────────────────────────────────

export interface BudgetRow {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  total: number;
  converted_to_order: boolean | number;
  active: boolean;
  /** Joined desde clients */
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  /** Joined desde users */
  user_username: string | null;
  edited_by_username: string | null;
}

export interface BudgetProductRow {
  id: number;
  budget_id: number;
  product_id: number | null;
  template_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string | null;
  template_description: string | null;
}

// ─── Payment ───────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: number;
  order_id: number | null;
  amount: number;
  date: string;
  descripcion: string | null;
  info: string | null;
  phone: string | null;
  client_name: string | null;
  is_simple_order?: boolean;
  simple_order_id?: number | null;
  cash_session_id: number | null;
  /** Joined desde orders (opcional, si se trae la orden) */
  order?: {
    id: number;
    client_id: number;
    status: OrderStatus;
    total: number;
    client_name: string | null;
    description: string | null;
    notes: string | null;
  } | null;
}

// ─── SimpleOrder ───────────────────────────────────────────────────────────

export interface SimpleOrderRow {
  id: number;
  user_id: number;
  date: string;
  concept: string;
  total: number;
  active: boolean;
  client_name: string;
  client_phone: string;
  /** Joined desde users */
  user_username: string | null;
}

// ─── SimpleOrderPayment ────────────────────────────────────────────────────

export interface SimpleOrderPaymentRow {
  id: number;
  simple_order_id: number;
  user_id: number;
  amount: number;
  date: string;
  descripcion: string | null;
  cash_session_id?: number | null;
  /** Joined desde users */
  user_username: string | null;
}

// ─── CashSession ───────────────────────────────────────────────────────────

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

// ─── Expenses ──────────────────────────────────────────────────────────────

export interface ExpensesRow {
  id: number;
  cash_session_id: number;
  user_id: number;
  edited_by: number | null;
  amount: number;
  description: string;
  date: string;
  active: boolean;
  supplier_order_id: number | null;
}

// ─── Supplier ──────────────────────────────────────────────────────────────

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

// ─── SupplierOrder ─────────────────────────────────────────────────────────

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

// ─── PrintLog ──────────────────────────────────────────────────────────────

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

// ─── Schema Migrations ─────────────────────────────────────────────────────

export interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────

/** Metadatos de paginación devueltos por los repositorios. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number | string;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
  searchTerm?: string;
}
