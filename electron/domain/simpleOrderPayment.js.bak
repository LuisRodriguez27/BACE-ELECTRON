class SimpleOrderPayment {
  constructor({
    id,
    simple_order_id,
    user_id,
    amount,
    date,
    descripcion,
    user_username
  }) {
    this.id = id;
    this.simple_order_id = simple_order_id;
    this.user_id = user_id;
    this.amount = parseFloat(amount) || 0;
    this.date = date;
    this.descripcion = descripcion || null;
    this.user_username = user_username || null;
  }

  isValid() {
    return (
      this.simple_order_id &&
      this.simple_order_id > 0 &&
      this.user_id &&
      this.user_id > 0 &&
      typeof this.amount === 'number' &&
      this.amount > 0 &&
      !isNaN(this.amount)
    );
  }

  getFormattedAmount() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.amount);
  }

  toPlainObject() {
    return {
      id: this.id,
      simple_order_id: this.simple_order_id,
      user_id: this.user_id,
      amount: this.amount,
      date: this.date,
      descripcion: this.descripcion,
      user_username: this.user_username
    };
  }
}

module.exports = SimpleOrderPayment;
