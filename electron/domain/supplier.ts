import type { SupplierRow } from '../types/domain';

class Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  columns: string[];
  is_active: boolean;

  constructor({ id, name, phone, email, description, columns, is_active = true }: SupplierRow) {
    this.id = id;
    this.name = name;
    this.phone = phone || null;
    this.email = email || null;
    this.description = description || null;

    try {
      this.columns = typeof columns === 'string' ? JSON.parse(columns) : (columns || []);
    } catch (_e) {
      this.columns = [];
    }

    this.is_active = is_active;
  }

  isActive(): boolean { return this.is_active === true; }

  toPlainObject() {
    return { id: this.id, name: this.name, phone: this.phone, email: this.email, description: this.description, columns: this.columns, is_active: this.is_active };
  }
}

export default Supplier;
