class SupplierOrder {
  constructor({
    id,
    supplier_id,
    order_id,
    status,
    notes,
    date,
    active = true,
    supplier_name,
    supplier_phone,
    order_total,
    supplierOrderItems = []
  }) {
    this.id = id;
    this.supplier_id = supplier_id;
    this.order_id = order_id || null;
    this.status = status || null;
    this.notes = notes || null;
    this.date = date;
    this.active = active;

    // Joined properties
    this.supplier_name = supplier_name || null;
    this.supplier_phone = supplier_phone || null;
    this.order_total = order_total !== undefined && order_total !== null ? parseFloat(order_total) : null;
    this.supplierOrderItems = supplierOrderItems || [];
  }

  isActive() {
    return this.active === true;
  }

  toPlainObject() {
    return {
      id: this.id,
      supplier_id: this.supplier_id,
      order_id: this.order_id,
      status: this.status,
      notes: this.notes,
      date: this.date,
      active: this.active,
      supplier_name: this.supplier_name,
      supplier_phone: this.supplier_phone,
      order_total: this.order_total,
      supplierOrderItems: this.supplierOrderItems
    };
  }
}

module.exports = SupplierOrder;
