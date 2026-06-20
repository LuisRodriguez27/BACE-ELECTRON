import type {
  ProductionLog,
  CreateProductionLogForm,
  EditProductionLogForm,
  GroupedProductionLogs,
  PaginatedProductionLogs,
  PaginatedHistoryDays
} from './types';

export const ProductionLogsApiService = {
  getActive: async (): Promise<GroupedProductionLogs[]> => {
    return window.api.getActiveProductionLogs();
  },

  getPaginated: async (
    page: number,
    limit: number,
    searchTerm: string = '',
    searchDate: string | null = null
  ): Promise<PaginatedProductionLogs> => {
    return window.api.getProductionLogsPaginated(page, limit, searchTerm, searchDate);
  },

  getHistoryDays: async (
    todayLocalStr: string,
    page: number,
    limit: number,
    searchTerm: string = '',
    searchDate: string | null = null
  ): Promise<PaginatedHistoryDays> => {
    return window.api.getProductionLogsHistoryDays(todayLocalStr, page, limit, searchTerm, searchDate);
  },

  getByDay: async (dateStr: string): Promise<ProductionLog[]> => {
    return window.api.getProductionLogsByDay(dateStr);
  },

  getById: async (id: number): Promise<ProductionLog> => {
    return window.api.getProductionLogById(id);
  },

  getByOrderId: async (orderId: number): Promise<ProductionLog[]> => {
    return window.api.getProductionLogsByOrderId(orderId);
  },

  create: async (data: CreateProductionLogForm): Promise<ProductionLog> => {
    return window.api.createProductionLog(data);
  },

  update: async (id: number, data: EditProductionLogForm): Promise<ProductionLog> => {
    return window.api.updateProductionLog(id, data);
  },

  updateCheckboxes: async (
    id: number,
    checkboxes: { completado?: boolean }
  ): Promise<ProductionLog> => {
    return window.api.updateProductionLogCheckboxes(id, checkboxes);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteProductionLog(id);
  }
};
