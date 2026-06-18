/**
 * Tipos del agregado Product.
 * Espeja domain/product.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

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

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface ProductData {
  name: string;
  serial_number?: string | null;
  price: number | string;
  promo_price?: number | string | null;
  discount_price?: number | string | null;
  description?: string | null;
  images?: string[] | null;
}
