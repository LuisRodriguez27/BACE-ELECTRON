const statsRepository = require('../repositories/statsRepository');
const productRepository = require('../repositories/productRepository');

// Helper function to calculate ISO week number (Monday start)
// Mimics date-fns getWeek with weekStartsOn: 1
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

class StatsService {
  async getSalesStats(params) {
    try {
      const { period, productId, customStartDate, customEndDate, month, year, dates, paymentMethod } = params;
      
      // Handle custom specific dates (multi-select)
      if (period === 'custom' && dates && Array.isArray(dates) && dates.length > 0) {
          const salesOverTime = await statsRepository.getSalesBySpecificDates(dates, productId, paymentMethod);
          const salesByProduct = await statsRepository.getSalesByProductForDates(dates, paymentMethod);
          
          const sortedDates = [...dates].sort();
          return {
            salesOverTime,
            salesByProduct,
            period: { startDate: sortedDates[0], endDate: sortedDates[sortedDates.length - 1], customType: 'dates', dates }
          };
      }

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

      const salesOverTime = await statsRepository.getSalesByDate(startDate, endDate, productId, paymentMethod);
      const salesByProduct = await statsRepository.getSalesByProduct(startDate, endDate, paymentMethod);

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
    return await statsRepository.getAvailableYears();
  }

  async getAvailableWeeks(year) {
    // Get raw dates from repo and calculate weeks using date-fns to match frontend logic
    const dates = await statsRepository.getAvailableWeeks(year);
    const weeks = dates.map(dateStr => {
      // Create date at noon to avoid timezone rolling to previous day
      const d = new Date(dateStr + 'T12:00:00'); 
      return getISOWeek(d);
    });
    
    // Return unique sorted weeks
    return [...new Set(weeks)].sort((a,b) => a - b);
  }

  // Helper to get products list for the filter
  async getProducts() {
     // We can reuse productRepository
     return await productRepository.findAll();
  }
}

module.exports = new StatsService();
