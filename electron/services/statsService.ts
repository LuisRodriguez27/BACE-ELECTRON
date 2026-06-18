import statsRepository from '../repositories/statsRepository';
import productRepository from '../repositories/productRepository';
import type { SalesStatsParams } from '../types/stats';

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

class StatsService {
  async getSalesStats(params: SalesStatsParams) {
    try {
      const { period, productId, customStartDate, customEndDate, month, year, dates, paymentMethod, source } = params;

      if (period === 'custom' && dates && Array.isArray(dates) && dates.length > 0) {
        const salesOverTime = await statsRepository.getSalesBySpecificDates(dates, productId, paymentMethod, source);
        const salesByProduct = await statsRepository.getSalesByProductForDates(dates, paymentMethod, source);
        const sortedDates = [...dates].sort();
        return { salesOverTime, salesByProduct, period: { startDate: sortedDates[0], endDate: sortedDates[sortedDates.length - 1], customType: 'dates', dates } };
      }

      let startDate: string, endDate: string;
      const now = new Date();
      const currentYear = year || now.getUTCFullYear();
      const currentMonth = month ? month - 1 : now.getUTCMonth();

      if (customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        if (period === 'week') {
          const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
          const startUtc = new Date(endUtc.getTime() - 6 * 24 * 60 * 60 * 1000);
          startUtc.setUTCHours(0, 0, 0, 0);
          startDate = startUtc.toISOString();
          endDate = endUtc.toISOString();
        } else if (period === 'year') {
          startDate = `${currentYear}-01-01T00:00:00.000Z`;
          endDate = `${currentYear}-12-31T23:59:59.999Z`;
        } else {
          const mStart = (currentMonth + 1).toString().padStart(2, '0');
          startDate = `${currentYear}-${mStart}-01T00:00:00.000Z`;
          const lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
          endDate = `${currentYear}-${mStart}-${lastDay}T23:59:59.999Z`;
        }
      }

      const salesOverTime = await statsRepository.getSalesByDate(startDate, endDate, productId, paymentMethod, source);
      const salesByProduct = await statsRepository.getSalesByProduct(startDate, endDate, paymentMethod, source);
      return { salesOverTime, salesByProduct, period: { startDate, endDate } };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error('Error al obtener estadísticas de ventas');
    }
  }

  async getAvailableYears(): Promise<number[]> {
    return await statsRepository.getAvailableYears();
  }

  async getAvailableWeeks(year: number): Promise<number[]> {
    const dates = await statsRepository.getAvailableWeeks(year);
    const weeks = (dates as string[]).map((dateStr: string) => {
      const d = new Date(dateStr + 'T00:00:00.000Z');
      return getISOWeek(d);
    });
    return [...new Set(weeks)].sort((a, b) => a - b);
  }

  async getProducts() {
    return await productRepository.findAll();
  }
}

export default new StatsService();
