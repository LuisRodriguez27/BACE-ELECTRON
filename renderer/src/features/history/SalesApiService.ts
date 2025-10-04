import type { Order } from "../orders/types";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchTerm?: string;
}

export const SalesApiService = {
  findAll: async (): Promise<Order[]> => {
    return window.api.getSales();
  },

  findAllPaginated: async (page: number, limit: number, searchTerm: string = ''): Promise<PaginatedResponse<Order>> => {
    return window.api.getSalesPaginated(page, limit, searchTerm);
  },

  searchPaginated: async (page: number, limit: number, searchTerm: string): Promise<PaginatedResponse<Order>> => {
    return window.api.searchSales(page, limit, searchTerm);
  }
}