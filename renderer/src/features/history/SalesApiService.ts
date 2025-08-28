import type { Order } from "../orders/types";


export const SalesApiService = {
  findAll: async (): Promise<Order[]> => {
    return window.api.getSales();
  }
}