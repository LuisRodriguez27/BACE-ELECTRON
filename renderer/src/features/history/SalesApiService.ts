import type { Order } from "../orders/types";

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const SalesApiService = {
  findAll: async (): Promise<Order[]> => {
    return window.api.getSales();
  },

  findAllPaginated: async (page: number, limit: number): Promise<PaginatedResponse<Order>> => {
    return window.api.getSalesPaginated(page, limit);
  }
}