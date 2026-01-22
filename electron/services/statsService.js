const statsRepository = require('../repositories/statsRepository');
const productRepository = require('../repositories/productRepository');

class StatsService {
  async getSalesStats(params) {
    try {
      const { period, productId, customStartDate, customEndDate, month, year } = params;
      
      let startDate, endDate;
      const now = new Date();
      const currentYear = year || now.getFullYear();
      const currentMonth = month ? month - 1 : now.getMonth(); // 0-indexed
      
      // Determine date range based on period
      if (customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        if (period === 'week') {
          // Last 7 days
           const weekAgo = new Date(now);
           weekAgo.setDate(now.getDate() - 7);
           startDate = weekAgo.toISOString();
           endDate = now.toISOString();
        } else if (period === 'month') {
           // Construct manually for the month to avoid timezone shifts
           const mStart = (currentMonth + 1).toString().padStart(2, '0');
           startDate = `${currentYear}-${mStart}-01T00:00:00.000Z`;
           
           // Calculate last day of month
           const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
           endDate = `${currentYear}-${mStart}-${lastDay}T23:59:59.999Z`;

        } else if (period === 'year') {
           // Explicitly construct UTC ISO strings for the full year 
           // to match how dates like "2025-09-03TXX:XX:XX.XXXZ" are stored
           // Start: YYYY-01-01T00:00:00.000Z
           // End:   YYYY-12-31T23:59:59.999Z
           
           startDate = `${currentYear}-01-01T00:00:00.000Z`;
           endDate = `${currentYear}-12-31T23:59:59.999Z`;
        } else {
           // Default to month
           // Construct manually for the month to avoid timezone shifts
           const mStart = (currentMonth + 1).toString().padStart(2, '0');
           startDate = `${currentYear}-${mStart}-01T00:00:00.000Z`;
           
           // Calculate last day of month
           const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
           endDate = `${currentYear}-${mStart}-${lastDay}T23:59:59.999Z`;
        }
      }

      const salesOverTime = statsRepository.getSalesByDate(startDate, endDate, productId);
      const salesByProduct = statsRepository.getSalesByProduct(startDate, endDate);

      return {
        salesOverTime,
        salesByProduct,
        period: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas de ventas');
    }
  }

  async getAvailableYears() {
    return statsRepository.getAvailableYears();
  }

  // Helper to get products list for the filter
  async getProducts() {
     // We can reuse productRepository
     return productRepository.findAll();
  }
}

module.exports = new StatsService();
