class SupplierOrderItem {
  constructor({
    id,
    supplier_order_id,
    item_data,
    active = true
  }) {
    this.id = id;
    this.supplier_order_id = supplier_order_id;
    this.active = active;

    // Handle parsed JSON or raw string
    try {
      this.item_data = typeof item_data === 'string' ? JSON.parse(item_data) : (item_data || {});
    } catch (e) {
      this.item_data = {};
    }
  }

  isActive() {
    return this.active === true;
  }

  toPlainObject() {
    return {
      id: this.id,
      supplier_order_id: this.supplier_order_id,
      item_data: this.item_data,
      active: this.active
    };
  }
}

module.exports = SupplierOrderItem;
