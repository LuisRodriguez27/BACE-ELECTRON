import type { Budget, CreateBudgetForm,BudgetProduct } from './types';

export const BudgetApiService = {
  findAll: async (): Promise<Budget[]> => {
    return window.api.getAllBudgets();
  },

  findById: async (id: number): Promise<Budget> => {
    return window.api.getBudgetById(id);
  },

  findByClientId: async (clientId: number): Promise<Budget[]> => {
    return window.api.getBudgetByClientId(clientId);
  },

  create: async (budget: CreateBudgetForm): Promise<Budget> => {
    return window.api.createBudget(budget);
  },

  delete: async (budgetId: number): Promise<void> => {
    return window.api.deleteBudget(budgetId);
  },

  getBudgetProducts: async (budgetId: number): Promise<BudgetProduct[]> => {
    return window.api.getBudgetProducts(budgetId);
  },

  recalculateTotal: async (budgetId: number): Promise<number> => {
    return window.api.recalculateBudgetTotal(budgetId);
  },

  transformToOrder: async (budgetId: number, userId: number): Promise<any> => {
    return window.api.transformToOrder(budgetId, userId);
  }
}  