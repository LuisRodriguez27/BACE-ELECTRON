// ── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

// ── Expense ───────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  cash_session_id: number;
  user_id: number;
  edited_by: number | null;
  amount: number;
  description: string;
  date: string;
  active: boolean;
  user_username?: string;
  edited_by_username?: string;
}

export interface CreateExpenseForm {
  cash_session_id: number;
  user_id: number;
  amount: number;
  description: string;
  date?: string;
}

export interface UpdateExpenseForm {
  amount?: number;
  description?: string;
  date?: string;
  edited_by?: number;
}

// ── SimpleOrderPayment (within a cash session) ────────────────────────────────

export interface CashSessionSimplePayment {
  id: number;
  simple_order_id: number;
  cash_session_id: number;
  user_id: number;
  user_username?: string;
  amount: number;
  date: string;
  descripcion?: string;
}

// ── OrderPayment (within a cash session) ─────────────────────────────────────

export interface CashSessionOrderPayment {
  id: number;
  order_id: number | null;
  cash_session_id: number;
  amount: number;
  date: string;
  descripcion?: string;
  info?: string;
}

// ── CashSession ───────────────────────────────────────────────────────────────

export type CashSessionStatus = 'open' | 'closed';

export interface CashSession {
  id: number;
  opening_date: string;
  closing_date: string | null;
  opening_balance: number;
  expected_balance: number;
  closing_balance: number;
  status: CashSessionStatus;
  notes: string | null;
  payments: CashSessionSimplePayment[];
  order_payments: CashSessionOrderPayment[];
  expenses: Expense[];
}

export interface CashSessionSummary {
  id: number;
  status: CashSessionStatus;
  opening_date: string;
  closing_date: string | null;
  opening_balance: number;
  total_simple_payments: number;
  total_order_payments: number;
  total_income: number;
  total_expenses: number;
  expected_balance: number;
  closing_balance: number;
  notes: string | null;
}

export interface OpenCashSessionForm {
  opening_balance: number;
  notes?: string;
}

export interface CloseCashSessionForm {
  closing_balance: number;
  notes?: string;
}

export interface UpdateCashSessionForm {
  opening_balance?: number;
  notes?: string;
}
