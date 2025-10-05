import type { PaginatedResponse } from '../history/SalesApiService';
import type { Budget, BudgetProduct, CreateBudgetForm } from './types';

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
  },

  getBudgetsPaginated: async (page: number, limit: number, searchTerm: string = ''): Promise<PaginatedResponse<Budget>> => {
    return window.api.getBudgetsPaginated(page, limit, searchTerm);
  },

  searchPaginated: async (page: number, limit: number, searchTerm: string): Promise<PaginatedResponse<Budget>> => {
    return window.api.searchBudgets(page, limit, searchTerm);
  },

  getNextId: async (): Promise<number> => {
    return window.api.getBudgetNextId();
  }
}  