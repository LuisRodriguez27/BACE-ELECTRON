import type { PrintLog, CreatePrintLogForm, EditPrintLogForm, GroupedPrintLogs, PaginatedPrintLogs, PaginatedHistoryDays } from './types';

export const PrintLogsApiService = {
  getActive: async (): Promise<GroupedPrintLogs[]> => {
    return window.api.getActivePrintLogs();
  },

  getPaginated: async (
    page: number, 
    limit: number, 
    searchTerm: string = '', 
    searchDate: string | null = null
  ): Promise<PaginatedPrintLogs> => {
    return window.api.getPrintLogsPaginated(page, limit, searchTerm, searchDate);
  },

  getHistoryDays: async (
    todayLocalStr: string,
    page: number,
    limit: number,
    searchTerm: string = '',
    searchDate: string | null = null
  ): Promise<PaginatedHistoryDays> => {
    return window.api.getPrintLogsHistoryDays(todayLocalStr, page, limit, searchTerm, searchDate);
  },

  getByDay: async (dateStr: string): Promise<PrintLog[]> => {
    return window.api.getPrintLogsByDay(dateStr);
  },

  getById: async (id: number): Promise<PrintLog> => {
    return window.api.getPrintLogById(id);
  },


  getByOrderId: async (orderId: number): Promise<PrintLog[]> => {
    return window.api.getPrintLogsByOrderId(orderId);
  },

  create: async (data: CreatePrintLogForm): Promise<PrintLog> => {
    return window.api.createPrintLog(data);
  },

  update: async (id: number, data: EditPrintLogForm): Promise<PrintLog> => {
    return window.api.updatePrintLog(id, data);
  },

  updateCheckboxes: async (
    id: number, 
    checkboxes: { completado?: boolean }
  ): Promise<PrintLog> => {
    return window.api.updatePrintLogCheckboxes(id, checkboxes);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deletePrintLog(id);
  }
};
