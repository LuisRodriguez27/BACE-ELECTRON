/**
 * Tipos del agregado ProductTemplate.
 * Espeja domain/productTemplate.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

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

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface TemplateData {
  product_id: number;
  final_price: number | string;
  promo_price?: number | string | null;
  discount_price?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  colors?: string | null;
  position?: string | null;
  texts?: string | null;
  description?: string | null;
  created_by?: number | string | null;
}
