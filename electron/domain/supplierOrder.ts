import type { SupplierOrderRow, SupplierOrderStatus } from '../types/domain';
import SupplierOrderItem from './supplierOrderItem';

class SupplierOrder {
  id: number;
  supplier_id: number;
  order_id: number | null;
  user_id: number | null;
  status: SupplierOrderStatus | null;
  notes: string | null;
  date: string;
  total: number;
  active: boolean;
  supplier_name: string | null;
  supplier_phone: string | null;
  order_total: number | null;
  username: string | null;
  supplierOrderItems: SupplierOrderItem[];

  constructor({ id, supplier_id, order_id, user_id, status, notes, date, active = true, supplier_name, supplier_phone, order_total, username, supplierOrderItems = [], total }: SupplierOrderRow & { supplierOrderItems?: SupplierOrderItem[] }) {
    this.id = id;
    this.supplier_id = supplier_id;
    this.order_id = order_id || null;
    this.user_id = user_id || null;
    this.status = status || null;
    this.notes = notes || null;
    this.date = date;
    this.active = active;
    this.total = total !== undefined && total !== null ? parseFloat(String(total)) : 0;
    this.supplier_name = supplier_name || null;
    this.supplier_phone = supplier_phone || null;
    this.order_total = order_total !== undefined && order_total !== null ? parseFloat(String(order_total)) : null;
    this.username = username || null;
    this.supplierOrderItems = supplierOrderItems || [];
  }

  isActive(): boolean { return this.active === true; }

  toPlainObject() {
    return { id: this.id, supplier_id: this.supplier_id, order_id: this.order_id, user_id: this.user_id, status: this.status, notes: this.notes, date: this.date, active: this.active, supplier_name: this.supplier_name, supplier_phone: this.supplier_phone, order_total: this.order_total, username: this.username, supplierOrderItems: this.supplierOrderItems, total: this.total };
  }
}

export default SupplierOrder;
