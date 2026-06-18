import type { SimpleOrderRow, SimpleOrderPaymentRow } from '../types/domain';
import SimpleOrderPayment from './simpleOrderPayment';

class SimpleOrder {
  id: number;
  user_id: number;
  date: string;
  concept: string;
  total: number;
  active: boolean;
  user_username: string | null;
  client_name: string;
  client_phone: string;
  payments: InstanceType<typeof SimpleOrderPayment>[];

  constructor({ id, user_id, date, concept, total, active = true, user_username, client_name, client_phone, payments = [] }: SimpleOrderRow & { payments?: SimpleOrderPaymentRow[] }) {
    this.id = id;
    this.user_id = user_id;
    this.date = date;
    this.concept = concept;
    this.total = parseFloat(String(total)) || 0;
    this.active = active;
    this.user_username = user_username || null;
    this.client_name = client_name || '';
    this.client_phone = client_phone || '';
    this.payments = payments ? payments.map((p) => new SimpleOrderPayment(p)) : [];
  }

  isActive(): boolean { return this.active === true; }
  getUser() { return { id: this.user_id, username: this.user_username }; }

  getFormattedDate(): string {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getFormattedTotal(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.total);
  }

  getTotalPaid(): number { return this.payments.reduce((sum: number, p: InstanceType<typeof SimpleOrderPayment>) => sum + p.amount, 0); }
  getBalance(): number { return this.total - this.getTotalPaid(); }

  isValid(): boolean {
    return !!(this.user_id && this.user_id > 0 && this.concept && this.concept.trim().length > 0 && typeof this.total === 'number' && this.total >= 0 && !isNaN(this.total));
  }

  toPlainObject() {
    return { id: this.id, user_id: this.user_id, date: this.date, concept: this.concept, total: this.total, active: this.active, client_name: this.client_name, client_phone: this.client_phone, user: this.getUser(), payments: this.payments.map((p: InstanceType<typeof SimpleOrderPayment>) => p.toPlainObject()), totalPaid: this.getTotalPaid(), balance: this.getBalance() };
  }
}

export default SimpleOrder;
