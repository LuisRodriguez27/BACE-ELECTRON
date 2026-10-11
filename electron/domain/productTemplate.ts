import type { ProductTemplateRow } from '../types/domain';

class ProductTemplate {
  id: number;
  product_id: number;
  final_price: number;
  promo_price: number | null;
  discount_price: number | null;
  width: number | null;
  height: number | null;
  colors: string | null;
  position: string | null;
  texts: string | null;
  description: string | null;
  created_by: number | null;
  active: boolean;
  product_name: string | null;
  serial_number: string | null;
  created_by_username: string | null;

  constructor({ id, product_id, final_price, promo_price, discount_price, width, height, colors, position, texts, description, created_by, active = true, product_name, serial_number, created_by_username }: ProductTemplateRow & { serial_number?: string | null }) {
    this.id = id;
    this.product_id = product_id;
    this.final_price = parseFloat(String(final_price)) || 0;
    this.promo_price = promo_price !== null && promo_price !== undefined ? parseFloat(String(promo_price)) : null;
    this.discount_price = discount_price !== null && discount_price !== undefined ? parseFloat(String(discount_price)) : null;
    this.width = width ? parseFloat(String(width)) : null;
    this.height = height ? parseFloat(String(height)) : null;
    this.colors = colors || null;
    this.position = position || null;
    this.texts = texts || null;
    this.description = description || null;
    this.created_by = created_by || null;
    this.active = active;
    this.product_name = product_name || null;
    this.serial_number = serial_number || null;
    this.created_by_username = created_by_username || null;
  }

  isActive(): boolean { return this.active === true; }
  hasCustomDimensions(): boolean { return this.width !== null && this.height !== null; }
  hasColors(): boolean { return !!(this.colors && this.colors.trim().length > 0); }
  hasPosition(): boolean { return !!(this.position && this.position.trim().length > 0); }
  hasTexts(): boolean { return !!(this.texts && this.texts.trim().length > 0); }
  hasDescription(): boolean { return !!(this.description && this.description.trim().length > 0); }
  isFree(): boolean { return this.final_price === 0; }
  isPaid(): boolean { return this.final_price > 0; }

  getDisplayName(): string {
    if (this.hasDescription()) return `${this.product_name} - ${this.description}`;
    return `${this.product_name} - Plantilla ${this.id}`;
  }

  getFormattedPrice(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.final_price);
  }

  getDimensions(): string | null {
    if (!this.hasCustomDimensions()) return null;
    return `${this.width} × ${this.height}`;
  }

  getColorsText(): string { return this.colors || ''; }
  getTextsText(): string { return this.texts || ''; }

  isValid(): boolean {
    return !!(this.product_id && this.product_id > 0 && typeof this.final_price === 'number' && this.final_price >= 0 && !isNaN(this.final_price));
  }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return !!(
      (this.product_name && this.product_name.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      (this.serial_number && this.serial_number.toLowerCase().includes(term)) ||
      (this.position && this.position.toLowerCase().includes(term)) ||
      (this.texts && this.texts.toLowerCase().includes(term)) ||
      (this.created_by_username && this.created_by_username.toLowerCase().includes(term))
    );
  }

  toPlainObject() {
    return { id: this.id, product_id: this.product_id, final_price: this.final_price, promo_price: this.promo_price, discount_price: this.discount_price, width: this.width, height: this.height, colors: this.colors, position: this.position, texts: this.texts, description: this.description, created_by: this.created_by, active: this.active, product_name: this.product_name, serial_number: this.serial_number, created_by_username: this.created_by_username };
  }
}

export default ProductTemplate;
