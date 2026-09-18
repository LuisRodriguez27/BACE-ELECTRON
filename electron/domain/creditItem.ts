import type { CreditItemRow, CreditSourceType } from '../types/credit';

class CreditItem {
  id: number;
  credit_id: number;
  order_id: number | null;
  simple_order_id: number | null;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_by: number;
  edited_by: number | null;
  active: boolean;
  source_client_name: string | null;
  source_client_phone: string | null;
  source_total: number | null;
  created_by_username: string | null;
  edited_by_username: string | null;

  constructor(row: CreditItemRow) {
    this.id = row.id;
    this.credit_id = row.credit_id;
    this.order_id = row.order_id || null;
    this.simple_order_id = row.simple_order_id || null;
    this.date = row.date;
    this.product = row.product;
    this.quantity = parseFloat(String(row.quantity)) || 0;
    this.unit_price = parseFloat(String(row.unit_price)) || 0;
    this.total = parseFloat(String(row.total)) || 0;
    this.created_by = row.created_by;
    this.edited_by = row.edited_by || null;
    this.active = row.active;
    this.source_client_name = row.source_client_name || null;
    this.source_client_phone = row.source_client_phone || null;
    this.source_total = row.source_total == null ? null : parseFloat(String(row.source_total));
    this.created_by_username = row.created_by_username || null;
    this.edited_by_username = row.edited_by_username || null;
  }

  getSourceType(): CreditSourceType {
    if (this.order_id) return 'order';
    if (this.simple_order_id) return 'simple_order';
    return 'manual';
  }

  toPlainObject() {
    return {
      id: this.id,
      credit_id: this.credit_id,
      order_id: this.order_id,
      simple_order_id: this.simple_order_id,
      source_type: this.getSourceType(),
      date: this.date,
      product: this.product,
      quantity: this.quantity,
      unit_price: this.unit_price,
      total: this.total,
      created_by: this.created_by,
      edited_by: this.edited_by,
      active: this.active,
      source_client_name: this.source_client_name,
      source_client_phone: this.source_client_phone,
      source_total: this.source_total,
      created_by_username: this.created_by_username,
      edited_by_username: this.edited_by_username,
    };
  }
}

export default CreditItem;
