const SimpleOrderPayment = require('./simpleOrderPayment');
const Payment = require('./payments');
const Expenses = require('./expenses');

class CashSession {
  constructor({
    id,
    opening_date,
    closing_date,
    opening_balance,
    expected_balance,
    closing_balance,
    status,
    notes,
    payments = [],
    order_payments = [],
    expenses = []
  }) {
    this.id = id;
    this.opening_date = opening_date;
    this.closing_date = closing_date || null;
    this.opening_balance = parseFloat(opening_balance) || 0;
    this.expected_balance = parseFloat(expected_balance) || 0;
    this.closing_balance = parseFloat(closing_balance) || 0;
    this.status = status;
    this.notes = notes || null;

    this.payments = payments.map(p => new SimpleOrderPayment(p));
    this.order_payments = order_payments.map(p => new Payment(p));
    this.expenses = expenses.map(e => new Expenses(e));
  }

  isActive() {
    return this.status === 'open';
  }

  isValid() {
    return (
      this.opening_date &&
      typeof this.opening_balance === 'number' &&
      this.opening_balance >= 0 &&
      !isNaN(this.opening_balance) &&
      this.status
    );
  }

  getTotalSimplePayments() {
    return this.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getTotalOrderPayments() {
    return this.order_payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getTotalIncome() {
    return this.getTotalSimplePayments() + this.getTotalOrderPayments();
  }

  getTotalExpenses() {
    return this.expenses
      .filter(e => e.active)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getExpectedBalance() {
    return this.opening_balance + this.getTotalIncome() - this.getTotalExpenses();
  }

  toPlainObject() {
    return {
      id: this.id,
      opening_date: this.opening_date,
      closing_date: this.closing_date,
      opening_balance: this.opening_balance,
      expected_balance: this.expected_balance,
      closing_balance: this.closing_balance,
      status: this.status,
      notes: this.notes,
      payments: this.payments.map(p => p.toPlainObject()),
      order_payments: this.order_payments.map(p => p.toPlainObject()),
      expenses: this.expenses.map(e => e.toPlainObject()),
    };
  }
}

module.exports = CashSession;