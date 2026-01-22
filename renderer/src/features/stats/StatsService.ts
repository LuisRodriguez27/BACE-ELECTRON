export const StatsService = {
  getSalesStats: async (params: { 
    period?: 'week' | 'month' | 'year', 
    productId?: number | null, 
    customStartDate?: string, 
    customEndDate?: string,
    month?: number,
    year?: number 
  }) => {
    return await window.api.getSalesStats(params);
  },
  getProducts: async () => {
    return await window.api.getStatsProducts();
  },
  getAvailableYears: async () => {
    return await window.api.getAvailableYears();
  }
};
