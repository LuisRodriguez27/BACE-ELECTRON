const db = require('../db');

class StatsRepository {
  getSalesByDate(startDate, endDate, productId = null) {
    if (productId) {
      const stmt = db.prepare(`
        SELECT substr(o.date, 1, 10) as sale_date, SUM(op.total_price) as total, SUM(op.quantity) as quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        LEFT JOIN product_templates pt ON op.template_id = pt.id
        WHERE o.status = 'completado' 
          AND o.active = 1 
          AND o.date >= ? 
          AND o.date <= ?
          AND (op.product_id = ? OR pt.product_id = ?)
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return stmt.all(startDate, endDate, productId, productId);
    } else {
      const stmt = db.prepare(`
        SELECT substr(date, 1, 10) as sale_date, SUM(total) as total, COUNT(id) as quantity
        FROM orders
        WHERE status = 'completado' 
          AND active = 1 
          AND date >= ? 
          AND date <= ?
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return stmt.all(startDate, endDate);
    }
  }

  getSalesByProduct(startDate, endDate) {
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
      WHERE o.status = 'completado' 
        AND o.active = 1
        AND o.date >= ? 
        AND o.date <= ?
      GROUP BY p.id
      ORDER BY total DESC
    `);
    
    return stmt.all(startDate, endDate);
  }

  getAvailableYears() {
    const stmt = db.prepare(`
      SELECT DISTINCT substr(date, 1, 4) as year
      FROM orders
      WHERE status = 'completado' AND active = 1 AND date IS NOT NULL
      ORDER BY year DESC
    `);
    
    const rawResults = stmt.all();

    // Add current year if not present
    const years = rawResults.map(r => parseInt(r.year)).filter(y => !isNaN(y));
    const currentYear = new Date().getFullYear();
    
    // Ensure we have unique values
    const uniqueYears = [...new Set(years)];

    if (!uniqueYears.includes(currentYear)) {
      uniqueYears.unshift(currentYear);
    }
    
    return uniqueYears.sort((a, b) => b - a); // Sort descending
  }
}

module.exports = new StatsRepository();
