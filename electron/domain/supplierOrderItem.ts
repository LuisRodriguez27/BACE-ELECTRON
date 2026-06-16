import type { SupplierOrderItemRow } from '../types/domain';

class SupplierOrderItem {
  id: number;
  supplier_order_id: number;
  active: boolean;
  item_data: Record<string, unknown>;

  constructor({ id, supplier_order_id, item_data, active = true }: SupplierOrderItemRow) {
    this.id = id;
    this.supplier_order_id = supplier_order_id;
    this.active = Boolean(active);

    try {
      this.item_data = typeof item_data === 'string' ? JSON.parse(item_data as string) : ((item_data as Record<string, unknown>) || {});
    } catch (_e) {
      this.item_data = {};
    }
  }

  isActive(): boolean { return this.active === true; }

  toPlainObject() {
    return { id: this.id, supplier_order_id: this.supplier_order_id, item_data: this.item_data, active: this.active };
  }
}

module.exports = SupplierOrderItem;
