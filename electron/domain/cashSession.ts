import type { CashSessionRow, CashSessionStatus, SimpleOrderPaymentRow, PaymentRow, ExpensesRow } from '../types/domain';
import SimpleOrderPayment from './simpleOrderPayment';
import Payment from './payments';
import Expenses from './expenses';

class CashSession {
  id: number;
  opening_date: string;
  closing_date: string | null;
  opening_balance: number;
  expected_balance: number;
  closing_balance: number;
  status: CashSessionStatus;
  notes: string | null;
  payments: InstanceType<typeof SimpleOrderPayment>[];
  order_payments: InstanceType<typeof Payment>[];
  expenses: InstanceType<typeof Expenses>[];

  constructor({ id, opening_date, closing_date, opening_balance, expected_balance, closing_balance, status, notes, payments = [], order_payments = [], expenses = [] }: CashSessionRow & { payments?: SimpleOrderPaymentRow[]; order_payments?: PaymentRow[]; expenses?: ExpensesRow[] }) {
    this.id = id;
    this.opening_date = opening_date;
    this.closing_date = closing_date || null;
    this.opening_balance = parseFloat(String(opening_balance)) || 0;
    this.expected_balance = parseFloat(String(expected_balance)) || 0;
    this.closing_balance = parseFloat(String(closing_balance)) || 0;
    this.status = status;
    this.notes = notes || null;
    this.payments = payments.map((p) => new SimpleOrderPayment(p));
    this.order_payments = order_payments.map((p) => new Payment(p));
    this.expenses = expenses.map((e) => new Expenses(e));
  }

  isActive(): boolean { return this.status === 'open'; }

  isValid(): boolean {
    return !!(this.opening_date && typeof this.opening_balance === 'number' && this.opening_balance >= 0 && !isNaN(this.opening_balance) && this.status);
  }

  getTotalSimplePayments(): number { return this.payments.reduce((sum: number, p: InstanceType<typeof SimpleOrderPayment>) => sum + p.amount, 0); }
  getTotalOrderPayments(): number { return this.order_payments.reduce((sum: number, p: InstanceType<typeof Payment>) => sum + p.amount, 0); }
  getTotalIncome(): number { return this.getTotalSimplePayments() + this.getTotalOrderPayments(); }
  getTotalExpenses(): number { return this.expenses.filter((e: InstanceType<typeof Expenses>) => e.active).reduce((sum: number, e: InstanceType<typeof Expenses>) => sum + e.amount, 0); }
  getExpectedBalance(): number { return this.opening_balance + this.getTotalIncome() - this.getTotalExpenses(); }

  toPlainObject() {
    return { id: this.id, opening_date: this.opening_date, closing_date: this.closing_date, opening_balance: this.opening_balance, expected_balance: this.expected_balance, closing_balance: this.closing_balance, status: this.status, notes: this.notes, payments: this.payments.map((p: InstanceType<typeof SimpleOrderPayment>) => p.toPlainObject()), order_payments: this.order_payments.map((p: InstanceType<typeof Payment>) => p.toPlainObject()), expenses: this.expenses.map((e: InstanceType<typeof Expenses>) => e.toPlainObject()) };
  }
}

export default CashSession;
