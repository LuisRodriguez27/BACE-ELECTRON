const db = require('../db');

class StatsRepository {
  async getSalesByDate(startDate, endDate, productId = null) {
    if (productId) {
      const stmt = db.prepare(`
        SELECT TO_CHAR(o.date, 'YYYY-MM-DD') as sale_date, SUM(op.total_price) as total, SUM(op.quantity) as quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        LEFT JOIN product_templates pt ON op.template_id = pt.id
        WHERE o.active = 1 
          AND o.date >= ? 
          AND o.date <= ?
          AND (op.product_id = ? OR pt.product_id = ?)
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(startDate, endDate, productId, productId);
    } else {
      const stmt = db.prepare(`
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as sale_date, SUM(total) as total, COUNT(id) as quantity
        FROM orders
        WHERE active = 1 
          AND date >= ? 
          AND date <= ?
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(startDate, endDate);
    }
  }

  async getSalesByProduct(startDate, endDate) {
    // Need to handle direct products and templates
    // If template_id is used, we trace back to the product via product_templates
    const stmt = db.prepare(`
      SELECT p.id, p.name, SUM(op.total_price) as total, SUM(op.quantity) as quantity
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p_direct ON op.product_id = p_direct.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      JOIN products p ON (p_direct.id = p.id OR p_template.id = p.id)
      WHERE o.active = 1
        AND o.date >= ? 
        AND o.date <= ?
      GROUP BY p.id
      ORDER BY total DESC
    `);
    
    return await stmt.all(startDate, endDate);
  }

  async getSalesBySpecificDates(dates, productId = null) {
    if (!dates || dates.length === 0) return [];
    
    // Create placeholders for the IN clause
    const placeholders = dates.map(() => '?').join(',');
    
    if (productId) {
      const stmt = db.prepare(`
        SELECT TO_CHAR(o.date, 'YYYY-MM-DD') as sale_date, SUM(op.total_price) as total, SUM(op.quantity) as quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        LEFT JOIN product_templates pt ON op.template_id = pt.id
        WHERE o.active = 1 
          AND TO_CHAR(o.date, 'YYYY-MM-DD') IN (${placeholders})
          AND (op.product_id = ? OR pt.product_id = ?)
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...dates, productId, productId);
    } else {
      const stmt = db.prepare(`
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as sale_date, SUM(total) as total, COUNT(id) as quantity
        FROM orders
        WHERE active = 1 
          AND TO_CHAR(date, 'YYYY-MM-DD') IN (${placeholders})
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...dates);
    }
  }

  async getSalesByProductForDates(dates) {
    if (!dates || dates.length === 0) return [];
    const placeholders = dates.map(() => '?').join(',');

    const stmt = db.prepare(`
      SELECT p.id, p.name, SUM(op.total_price) as total, SUM(op.quantity) as quantity
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p_direct ON op.product_id = p_direct.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      JOIN products p ON (p_direct.id = p.id OR p_template.id = p.id)
      WHERE o.active = 1
        AND TO_CHAR(o.date, 'YYYY-MM-DD') IN (${placeholders})
      GROUP BY p.id
      ORDER BY total DESC
    `);
    
    return await stmt.all(...dates);
  }

  async getAvailableYears() {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT TO_CHAR(date, 'YYYY') as year
        FROM orders
        WHERE active = 1 AND date IS NOT NULL
        ORDER BY year DESC
      `);
      
      const rawResults = await stmt.all();

      // Add current year if not present
      const years = rawResults.map(r => parseInt(r.year)).filter(y => !isNaN(y));
      const currentYear = new Date().getFullYear();
      
      // Ensure we have unique values
      const uniqueYears = [...new Set(years)];

      if (!uniqueYears.includes(currentYear)) {
        uniqueYears.unshift(currentYear);
      }
      
      return uniqueYears.sort((a, b) => b - a);
    } catch (err) {
      console.error('Error fetching available years:', err);
      return [new Date().getFullYear()];
    }
  }

  async getAvailableWeeks(year) {
    // Return all sale dates for the year so we can calculate weeks accurately in the service using date-fns
    const stmt = db.prepare(`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM-DD') as sale_date
      FROM orders
      WHERE active = 1 
        AND TO_CHAR(date, 'YYYY') = ?
      ORDER BY sale_date ASC
    `);
    
    return (await stmt.all(year.toString())).map(r => r.sale_date);
  }
}

module.exports = new StatsRepository();
