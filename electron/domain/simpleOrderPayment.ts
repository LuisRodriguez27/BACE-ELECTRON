import type { SimpleOrderPaymentRow } from '../types/domain';

class SimpleOrderPayment {
  id: number;
  simple_order_id: number;
  user_id: number;
  amount: number;
  date: string;
  descripcion: string | null;
  user_username: string | null;

  constructor({ id, simple_order_id, user_id, amount, date, descripcion, user_username }: SimpleOrderPaymentRow) {
    this.id = id;
    this.simple_order_id = simple_order_id;
    this.user_id = user_id;
    this.amount = parseFloat(String(amount)) || 0;
    this.date = date;
    this.descripcion = descripcion || null;
    this.user_username = user_username || null;
  }

  isValid(): boolean {
    return !!(this.simple_order_id && this.simple_order_id > 0 && this.user_id && this.user_id > 0 && typeof this.amount === 'number' && this.amount > 0 && !isNaN(this.amount));
  }

  getFormattedAmount(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.amount);
  }

  toPlainObject() {
    return { id: this.id, simple_order_id: this.simple_order_id, user_id: this.user_id, amount: this.amount, date: this.date, descripcion: this.descripcion, user_username: this.user_username };
  }
}

export default SimpleOrderPayment;
