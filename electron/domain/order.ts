import type { OrderRow, OrderProductRow, OrderStatus, OrderResponsable } from '../types/domain';

class Order {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  estimated_delivery_date: string | null;
  status: OrderStatus;
  responsable: OrderResponsable | null;
  total: number;
  notes: string | null;
  description: string | null;
  active: boolean;
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  user_username: string | null;
  edited_by_username: string | null;
  orderProducts: OrderProductRow[];

  static VALID_STATUSES: OrderStatus[] = ['Revision', 'Diseño', 'Produccion', 'Entrega', 'Completado', 'Cancelado'];
  static STATUS = { REVISION: 'Revision' as const, DISENO: 'Diseño' as const, PRODUCCION: 'Produccion' as const, ENTREGA: 'Entrega' as const, COMPLETADO: 'Completado' as const, CANCELADO: 'Cancelado' as const };
  static VALID_RESPONSABLES: OrderResponsable[] = ['Mostrador', 'Maquila'];
  static RESPONSABLE = { MOSTRADOR: 'Mostrador' as const, MAQUILA: 'Maquila' as const };

  constructor({ id, client_id, user_id, edited_by, date, estimated_delivery_date, status, responsable, total, notes, description, active = true, client_name, client_phone, client_color, user_username, edited_by_username, orderProducts = [] }: OrderRow & { orderProducts?: OrderProductRow[] }) {
    this.id = id;
    this.client_id = client_id;
    this.user_id = user_id;
    this.edited_by = edited_by || null;
    this.date = date;
    this.estimated_delivery_date = estimated_delivery_date || null;
    this.status = status || 'Revision';
    this.responsable = responsable || null;
    this.total = parseFloat(String(total)) || 0;
    this.notes = notes || null;
    this.description = description || null;
    this.active = active;
    this.client_name = client_name || null;
    this.client_phone = client_phone || null;
    this.client_color = client_color || null;
    this.user_username = user_username || null;
    this.edited_by_username = edited_by_username || null;
    this.orderProducts = orderProducts || [];
  }

  isActive(): boolean { return this.active === true; }
  isRevision(): boolean { return this.status === Order.STATUS.REVISION; }
  isDesign(): boolean { return this.status === Order.STATUS.DISENO; }
  isProduction(): boolean { return this.status === Order.STATUS.PRODUCCION; }
  isDelivery(): boolean { return this.status === Order.STATUS.ENTREGA; }
  isCompleted(): boolean { return this.status === Order.STATUS.COMPLETADO; }
  isCancelled(): boolean { return this.status === Order.STATUS.CANCELADO; }
  hasResponsable(): boolean { return !!(this.responsable && this.responsable.trim().length > 0); }
  hasEstimatedDelivery(): boolean { return !!(this.estimated_delivery_date && this.estimated_delivery_date.trim().length > 0); }
  hasNotes(): boolean { return !!(this.notes && this.notes.trim().length > 0); }
  hasDescription(): boolean { return !!(this.description && this.description.trim().length > 0); }
  hasProducts(): boolean { return this.orderProducts && this.orderProducts.length > 0; }
  hasItems(): boolean { return this.hasProducts(); }
  wasEdited(): boolean { return this.edited_by !== null; }

  static isValidStatus(status: string): boolean { return Order.VALID_STATUSES.includes(status as OrderStatus); }
  static isValidResponsable(responsable: string): boolean { return Order.VALID_RESPONSABLES.includes(responsable as OrderResponsable); }

  getClient() { return { id: this.client_id, name: this.client_name, phone: this.client_phone, color: this.client_color }; }
  getUser() { return { id: this.user_id, username: this.user_username }; }
  getEditedByUser() { if (!this.edited_by) return null; return { id: this.edited_by, username: this.edited_by_username }; }

  getFormattedDate(): string {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getFormattedEstimatedDelivery(): string {
    if (!this.estimated_delivery_date) return '';
    return new Date(this.estimated_delivery_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getFormattedTotal(): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(this.total);
  }

  calculateTotalFromProducts(): number {
    if (!this.hasProducts()) return 0;
    return this.orderProducts.reduce((sum, product) => sum + (parseFloat(String(product.unit_price)) * parseFloat(String(product.quantity))), 0);
  }

  isValid(): boolean {
    return !!(this.client_id && this.user_id && this.user_id > 0 && Order.isValidStatus(this.status) && this.responsable && Order.isValidResponsable(this.responsable) && this.responsable.trim().length > 0 && typeof this.total === 'number' && this.total >= 0 && !isNaN(this.total) && this.hasProducts());
  }

  getProductsCount(): number { if (!this.orderProducts) return 0; return this.orderProducts.filter(item => item.product_id !== null).length; }
  getTemplatesCount(): number { if (!this.orderProducts) return 0; return this.orderProducts.filter(item => item.template_id !== null).length; }
  getTotalItemsCount(): number { if (!this.orderProducts) return 0; return this.orderProducts.length; }
  getTotalQuantity(): number { if (!this.orderProducts) return 0; return this.orderProducts.reduce((sum, item) => sum + (item.quantity || 0), 0); }

  getStatusColor(): string {
    const colors: Record<string, string> = { Revision: 'yellow', Diseño: 'orange', Produccion: 'blue', Entrega: 'cyan', Completado: 'green', Cancelado: 'red' };
    return colors[this.status] || 'gray';
  }

  getStatusLabel(): string {
    const labels: Record<string, string> = { Revision: 'Revisión', Diseño: 'Diseño', Produccion: 'Producción', Entrega: 'Entrega', Completado: 'Completado', Cancelado: 'Cancelado' };
    return labels[this.status] || this.status;
  }

  getResposable(): string { return this.responsable || 'Mostrador'; }
  getDisplayName(): string { return `Orden #${this.id} - ${this.client_name}`; }

  getDisplaySummary(): string {
    const totalItems = this.getTotalItemsCount(), totalQuantity = this.getTotalQuantity(), productsCount = this.getProductsCount(), templatesCount = this.getTemplatesCount();
    let summary = '';
    if (productsCount > 0 && templatesCount > 0) { summary = `${productsCount} productos, ${templatesCount} plantillas`; }
    else if (productsCount > 0) { summary = `${productsCount} ${productsCount === 1 ? 'producto' : 'productos'}`; }
    else if (templatesCount > 0) { summary = `${templatesCount} ${templatesCount === 1 ? 'plantilla' : 'plantillas'}`; }
    if (totalQuantity > totalItems) { summary += ` (${totalQuantity} unidades)`; }
    return `${summary} - ${this.getFormattedTotal()}`;
  }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return !!(
      (this.client_name && this.client_name.toLowerCase().includes(term)) ||
      (this.client_phone && this.client_phone.includes(term)) ||
      (this.notes && this.notes.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      (this.status && this.status.toLowerCase().includes(term)) ||
      (this.id && this.id.toString().includes(term))
    );
  }

  canEdit(): boolean { return !this.isCancelled(); }
  canEditProducts(): boolean { return false; }
  canCancel(): boolean { return !this.isCompleted() && !this.isCancelled(); }
  canComplete(): boolean { return !this.isCompleted() && !this.isCancelled(); }

  toPlainObject() {
    return { id: this.id, client_id: this.client_id, user_id: this.user_id, edited_by: this.edited_by, date: this.date, estimated_delivery_date: this.estimated_delivery_date, status: this.status, responsable: this.responsable, total: this.total, notes: this.notes, description: this.description, active: this.active, client_name: this.client_name, client: this.getClient(), user: this.getUser(), editedByUser: this.getEditedByUser(), orderProducts: this.orderProducts };
  }
}

export default Order;
