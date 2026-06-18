import type { ProductRow } from '../types/domain';

class Product {
  id: number;
  name: string;
  serial_number: string | null;
  price: number;
  promo_price: number | null;
  discount_price: number | null;
  description: string | null;
  images: string[];
  active: boolean;

  constructor({ id, name, serial_number, price, promo_price, discount_price, description, images, active = true }: ProductRow) {
    this.id = id;
    this.name = name;
    this.serial_number = serial_number || null;
    this.price = parseFloat(String(price)) || 0;
    this.promo_price = promo_price !== null && promo_price !== undefined ? parseFloat(String(promo_price)) : null;
    this.discount_price = discount_price !== null && discount_price !== undefined ? parseFloat(String(discount_price)) : null;
    this.description = description || null;

    let parsedImages: string[] = [];
    if (images) {
      if (typeof images === 'string') {
        try { parsedImages = JSON.parse(images); } catch (_e) { /* invalid JSON, keep empty */ }
      } else if (Array.isArray(images)) {
        parsedImages = images as string[];
      }
    }
    this.images = parsedImages;
    this.active = active;
  }

  isActive(): boolean { return this.active === true; }
  hasSerialNumber(): boolean { return !!(this.serial_number && this.serial_number.trim().length > 0); }
  hasDescription(): boolean { return !!(this.description && this.description.trim().length > 0); }
  isFree(): boolean { return this.price === 0; }
  isPaid(): boolean { return this.price > 0; }

  getDisplayName(): string {
    if (this.hasSerialNumber()) return `${this.name} (${this.serial_number})`;
    return this.name;
  }

  getFormattedPrice(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.price);
  }

  isValidPrice(): boolean {
    return typeof this.price === 'number' && this.price >= 0 && !isNaN(this.price);
  }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return !!(this.name.toLowerCase().includes(term) ||
      (this.serial_number && this.serial_number.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)));
  }

  toPlainObject() {
    return { id: this.id, name: this.name, serial_number: this.serial_number, price: this.price, promo_price: this.promo_price, discount_price: this.discount_price, description: this.description, images: this.images, active: this.active };
  }
}

export default Product;
