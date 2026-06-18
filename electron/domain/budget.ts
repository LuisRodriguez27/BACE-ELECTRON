import type { BudgetRow, BudgetProductRow } from '../types/domain';

class Budget {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  total: number;
  converted_to_order: boolean;
  active: boolean;
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  user_username: string | null;
  edited_by_username: string | null;
  budgetProducts: BudgetProductRow[];

  constructor({ id, client_id, user_id, edited_by, date, total, converted_to_order, active = true, client_name, client_phone, client_color, user_username, edited_by_username, budgetProducts = [] }: BudgetRow & { budgetProducts?: BudgetProductRow[] }) {
    this.id = id;
    this.client_id = client_id;
    this.user_id = user_id;
    this.edited_by = edited_by || null;
    this.date = date;
    this.total = parseFloat(String(total)) || 0;
    this.converted_to_order = !!converted_to_order;
    this.active = active;
    this.client_name = client_name || null;
    this.client_phone = client_phone || null;
    this.client_color = client_color || null;
    this.user_username = user_username || null;
    this.edited_by_username = edited_by_username || null;
    this.budgetProducts = budgetProducts || [];
  }

  isActive(): boolean { return this.active === true; }
  hasProducts(): boolean { return this.budgetProducts && this.budgetProducts.length > 0; }
  hasItems(): boolean { return this.hasProducts(); }
  wasEdited(): boolean { return this.edited_by !== null; }

  getClient() { return { id: this.client_id, name: this.client_name, phone: this.client_phone, color: this.client_color }; }
  getUser() { return { id: this.user_id, username: this.user_username }; }
  getEditedByUser() { if (!this.edited_by) return null; return { id: this.edited_by, username: this.edited_by_username }; }

  getFormattedDate(): string {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getFormattedTotal(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.total);
  }

  calculateTotalFromProducts(): number {
    if (!this.hasProducts()) return 0;
    return this.budgetProducts.reduce((sum, product) => sum + (parseFloat(String(product.unit_price)) * parseFloat(String(product.quantity))), 0);
  }

  isValid(): boolean {
    return !!(this.client_id && this.client_id > 0 && this.user_id && this.user_id > 0 && typeof this.total === 'number' && this.total >= 0 && !isNaN(this.total) && this.hasProducts());
  }

  getProductsCount(): number { if (!this.budgetProducts) return 0; return this.budgetProducts.filter(item => item.product_id !== null).length; }
  getTemplatesCount(): number { if (!this.budgetProducts) return 0; return this.budgetProducts.filter(item => item.template_id !== null).length; }
  getTotalItemsCount(): number { if (!this.budgetProducts) return 0; return this.budgetProducts.length; }
  getTotalQuantity(): number { if (!this.budgetProducts) return 0; return this.budgetProducts.reduce((sum, item) => sum + parseInt(String(item.quantity)), 0); }
  getDisplayName(): string { return `Presupuesto #${this.id} - ${this.getFormattedDate()}`; }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return !!(
      (this.client_name && this.client_name.toLowerCase().includes(term)) ||
      (this.client_phone && this.client_phone.includes(term)) ||
      (this.id && this.id.toString().includes(term))
    );
  }

  canConvertToOrder(): boolean { return this.isActive() && !this.converted_to_order && this.hasProducts() && this.total > 0; }
  isConvertedToOrder(): boolean { return this.converted_to_order === true; }
  canEdit(): boolean { return !this.converted_to_order && this.isActive(); }

  toPlainObject() {
    return { id: this.id, client_id: this.client_id, user_id: this.user_id, edited_by: this.edited_by, date: this.date, total: this.total, converted_to_order: this.converted_to_order, active: this.active, client: this.getClient(), user: this.getUser(), editedByUser: this.getEditedByUser(), budgetProducts: this.budgetProducts };
  }
}

export default Budget;
