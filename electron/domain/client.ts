import type { ClientRow } from '../types/domain';

class Client {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  description: string | null;
  color: string | null;
  active: boolean;

  constructor({ id, name, phone, address, description, color, active = true }: ClientRow & { address?: string | null; description?: string | null }) {
    this.id = id;
    this.name = name;
    this.phone = phone ?? '';
    this.address = (address as string | null | undefined) || null;
    this.description = (description as string | null | undefined) || null;
    this.color = color || null;
    this.active = active;
  }

  isActive(): boolean { return this.active === true; }
  hasAddress(): boolean { return !!(this.address && this.address.trim().length > 0); }
  hasDescription(): boolean { return !!(this.description && this.description.trim().length > 0); }
  hasColor(): boolean { return !!(this.color && this.color.trim().length > 0); }
  getDisplayName(): string { return `${this.name} (${this.phone})`; }

  getFormattedPhone(): string {
    if (!this.phone) return '';
    const cleaned = this.phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return this.phone;
  }

  toPlainObject() {
    return { id: this.id, name: this.name, phone: this.phone, address: this.address, description: this.description, color: this.color, active: this.active };
  }
}

export default Client;
