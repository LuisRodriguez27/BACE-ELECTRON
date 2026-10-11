import type { CreditRow, CreditItemRow, CreditPaymentRow, CreditStatus } from '../types/credit';
import CreditItem from './creditItem';

class Credit {
  id: number;
  client_id: number;
  opened_at: string;
  closing_date: string | null;
  status: CreditStatus;
  notes: string | null;
  created_by: number;
  active: boolean;
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  created_by_username: string | null;
  items: InstanceType<typeof CreditItem>[];
  payments: CreditPaymentRow[];

  constructor({ items = [], payments = [], ...row }: CreditRow & { items?: CreditItemRow[]; payments?: CreditPaymentRow[] }) {
    this.id = row.id;
    this.client_id = row.client_id;
    this.opened_at = row.opened_at;
    this.closing_date = row.closing_date || null;
    this.status = row.status;
    this.notes = row.notes || null;
    this.created_by = row.created_by;
    this.active = row.active;
    this.client_name = row.client_name || null;
    this.client_phone = row.client_phone || null;
    this.client_color = row.client_color || null;
    this.created_by_username = row.created_by_username || null;
    this.items = items.map((item) => new CreditItem(item));
    this.payments = payments.map((payment) => ({
      ...payment,
      amount: parseFloat(String(payment.amount)) || 0,
      cash_session_id: payment.cash_session_id || null,
      created_by: payment.created_by || null,
      descripcion: payment.descripcion || null,
      info: payment.info || null,
      client_name: payment.client_name || null,
      phone: payment.phone || null,
      created_by_username: payment.created_by_username || null,
    }));
  }

  isOpen(): boolean { return this.status === 'open'; }
  isClosed(): boolean { return this.status === 'closed'; }
  getTotalCharges(): number { return this.items.filter((item) => item.active).reduce((sum, item) => sum + item.total, 0); }
  getTotalPaid(): number { return this.payments.reduce((sum, payment) => sum + payment.amount, 0); }
  getBalance(): number { return this.getTotalCharges() - this.getTotalPaid(); }

  toPlainObject() {
    return {
      id: this.id,
      client_id: this.client_id,
      opened_at: this.opened_at,
      closing_date: this.closing_date,
      status: this.status,
      notes: this.notes,
      created_by: this.created_by,
      active: this.active,
      client_name: this.client_name,
      client_phone: this.client_phone,
      client_color: this.client_color,
      created_by_username: this.created_by_username,
      items: this.items.map((item) => item.toPlainObject()),
      payments: this.payments,
      total_charges: this.getTotalCharges(),
      total_paid: this.getTotalPaid(),
      balance: this.getBalance(),
    };
  }
}

export default Credit;
