import type { PaymentRow } from '../types/domain';

class Payment {
  id: number;
  order_id: number | null;
  amount: number;
  date: string;
  descripcion: string | null;
  info: string | null;
  phone: string | null;
  client_name: string | null;
  order: PaymentRow['order'];
  is_simple_order: boolean;
  simple_order_id: number | null;

  constructor({ id, order_id, amount, date, descripcion, info, phone, client_name, order = null, is_simple_order = false, simple_order_id = null }: PaymentRow) {
    this.id = id;
    this.order_id = order_id || null;
    this.amount = parseFloat(String(amount)) || 0;
    this.date = date;
    this.descripcion = descripcion || null;
    this.info = info || null;
    this.phone = phone || null;
    this.client_name = client_name || null;
    this.order = order;
    this.is_simple_order = is_simple_order ?? false;
    this.simple_order_id = simple_order_id || null;
  }

  hasOrder(): boolean { return this.order !== null && this.order !== undefined; }
  hasDescription(): boolean { return !!(this.descripcion && this.descripcion.trim().length > 0); }
  isValidAmount(): boolean { return typeof this.amount === 'number' && this.amount > 0 && !isNaN(this.amount); }
  isValidDate(): boolean { if (!this.date) return false; return !isNaN(new Date(this.date).getTime()); }
  isValid(): boolean { return this.isValidAmount() && this.isValidDate(); }

  getFormattedAmount(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.amount);
  }

  getFormattedDate(): string {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getFormattedDateTime(): string {
    if (!this.date) return '';
    return new Date(this.date).toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getOrder() {
    if (!this.hasOrder()) return null;
    return { id: this.order!.id, client_id: this.order!.client_id, status: this.order!.status, total: this.order!.total, client_name: this.order!.client_name, description: this.order!.description, notes: this.order!.notes };
  }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return !!(
      (this.descripcion && this.descripcion.toLowerCase().includes(term)) ||
      (this.amount && this.amount.toString().includes(term)) ||
      (this.id && this.id.toString().includes(term)) ||
      (this.order_id && this.order_id.toString().includes(term))
    );
  }

  getDisplayName(): string {
    if (this.is_simple_order) return `Pago #${this.id} - Orden Rápida #${this.simple_order_id}`;
    const orderInfo = this.hasOrder() ? ` - Orden #${this.order!.id}` : ` - Orden #${this.order_id}`;
    return `Pago #${this.id}${orderInfo}`;
  }

  getDisplaySummary(): string {
    const description = this.hasDescription() ? this.descripcion : 'Sin descripción';
    return `${this.getFormattedAmount()} - ${description}`;
  }

  canEdit(): boolean {
    if (this.hasOrder()) return this.order!.status !== 'Completado' && this.order!.status !== 'Cancelado';
    return true;
  }

  canDelete(): boolean { return this.canEdit(); }
  isPartialPayment(): boolean { if (!this.hasOrder()) return false; return this.amount < this.order!.total; }
  isFullPayment(): boolean { if (!this.hasOrder()) return false; return this.amount >= this.order!.total; }
  isOverPayment(): boolean { if (!this.hasOrder()) return false; return this.amount > this.order!.total; }

  getPaymentStatus(): string {
    if (!this.hasOrder()) return 'unknown';
    if (this.isOverPayment()) return 'overpaid';
    if (this.isFullPayment()) return 'full';
    if (this.isPartialPayment()) return 'partial';
    return 'unknown';
  }

  getPaymentStatusLabel(): string {
    const labels: Record<string, string> = { full: 'Pago Completo', partial: 'Pago Parcial', overpaid: 'Sobrepago', unknown: 'Desconocido' };
    return labels[this.getPaymentStatus()] || this.getPaymentStatus();
  }

  getPaymentStatusColor(): string {
    const colors: Record<string, string> = { full: 'green', partial: 'yellow', overpaid: 'orange', unknown: 'gray' };
    return colors[this.getPaymentStatus()] || 'gray';
  }

  toPlainObject() {
    return { id: this.id, order_id: this.order_id, amount: this.amount, date: this.date, descripcion: this.descripcion, info: this.info, phone: this.phone, client_name: this.client_name, order: this.getOrder(), formattedAmount: this.getFormattedAmount(), formattedDate: this.getFormattedDate(), formattedDateTime: this.getFormattedDateTime(), paymentStatus: this.getPaymentStatus(), paymentStatusLabel: this.getPaymentStatusLabel(), canEdit: this.canEdit(), canDelete: this.canDelete(), is_simple_order: this.is_simple_order, simple_order_id: this.simple_order_id };
  }
}

export default Payment;
