const SimpleOrderPayment = require('./simpleOrderPayment');

class SimpleOrder {
  constructor({
    id,
    user_id,
    date,
    concept,
    total,
    active = true,
    user_username,
    client_name,
    payments = []
  }) {
    this.id = id;
    this.user_id = user_id;
    this.date = date;
    this.concept = concept;
    this.total = parseFloat(total) || 0;
    this.active = active;
    this.user_username = user_username || null;
    this.client_name = client_name || '';
    this.payments = payments ? payments.map(p => new SimpleOrderPayment(p)) : [];
  }

  isActive() {
    return this.active === 1;
  }

  getUser() {
    return {
      id: this.user_id,
      username: this.user_username
    };
  }

  getFormattedDate() {
    if (!this.date) return '';
    return new Date(this.date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFormattedTotal() {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(this.total);
  }
  
  getTotalPaid() {
    return this.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  }
  
  getBalance() {
    return this.total - this.getTotalPaid();
  }

  isValid() {
    return (
      this.user_id &&
      this.user_id > 0 &&
      this.concept &&
      this.concept.trim().length > 0 &&
      typeof this.total === 'number' &&
      this.total >= 0 &&
      !isNaN(this.total)
    );
  }

  toPlainObject() {
    return {
      id: this.id,
      user_id: this.user_id,
      date: this.date,
      concept: this.concept,
      total: this.total,
      active: this.active,
      client_name: this.client_name,
      user: this.getUser(),
      payments: this.payments.map(p => p.toPlainObject()),
      totalPaid: this.getTotalPaid(),
      balance: this.getBalance()
    };
  }
}

module.exports = SimpleOrder;
