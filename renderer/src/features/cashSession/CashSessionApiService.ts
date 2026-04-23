import type {
  CashSession,
  CashSessionSummary,
  OpenCashSessionForm,
  CloseCashSessionForm,
  UpdateCashSessionForm,
  PaginatedResult,
  Expense,
  CreateExpenseForm,
  UpdateExpenseForm,
} from './types';

// ── Cash Sessions ─────────────────────────────────────────────────────────────

export const CashSessionApiService = {
  getAll: (page = 1, limit = 20): Promise<PaginatedResult<CashSession>> =>
    window.api.getCashSessions(page, limit),

  getClosed: (page = 1, limit = 20): Promise<PaginatedResult<CashSession>> =>
    window.api.getClosedCashSessions(page, limit),

  getActive: (): Promise<CashSession | null> =>
    window.api.getActiveCashSession(),

  getById: (id: number): Promise<CashSession> =>
    window.api.getCashSessionById(id),

  getByDateRange: (from: string, to: string): Promise<CashSession[]> =>
    window.api.getCashSessionsByDateRange(from, to),

  getSummary: (id: number): Promise<CashSessionSummary> =>
    window.api.getCashSessionSummary(id),

  open: (data: OpenCashSessionForm): Promise<CashSession> =>
    window.api.openCashSession(data),

  close: (id: number, data: CloseCashSessionForm): Promise<CashSession> =>
    window.api.closeCashSession(id, data),

  update: (id: number, data: UpdateCashSessionForm): Promise<CashSession> =>
    window.api.updateCashSession(id, data),
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export const ExpensesApiService = {
  getAll: (page = 1, limit = 20): Promise<PaginatedResult<Expense>> =>
    window.api.getExpenses(page, limit),

  getByCashSession: (cashSessionId: number): Promise<Expense[]> =>
    window.api.getExpensesByCashSession(cashSessionId),

  getById: (id: number): Promise<Expense> =>
    window.api.getExpenseById(id),

  create: (data: CreateExpenseForm): Promise<Expense> =>
    window.api.createExpense(data),

  update: (id: number, data: UpdateExpenseForm): Promise<Expense> =>
    window.api.updateExpense(id, data),

  delete: (id: number): Promise<void> =>
    window.api.deleteExpense(id),
};
