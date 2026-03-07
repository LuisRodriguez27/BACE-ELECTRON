const db = require('../db');

class StatsRepository {
  async getSalesByDate(startDate, endDate, productId = null, paymentMethod = null) {
    let params = [];
    
    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND ${dateCol} >= ? AND ${dateCol} <= ?`;
    params.push(startDate, endDate);
    
    if (productId) {
      whereClause += ` AND (op.product_id = ? OR pt.product_id = ?)`;
      params.push(productId, productId);
    }

    if (productId) {
      const stmt = db.prepare(`
        SELECT TO_CHAR(${dateCol}, 'YYYY-MM-DD') as sale_date, 
               COALESCE(${paymentMethod ? 'SUM(op.total_price * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.total_price)'}, 0) as total, 
               COALESCE(${paymentMethod ? 'SUM(op.quantity * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.quantity)'}, 0) as quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        LEFT JOIN product_templates pt ON op.template_id = pt.id
        ${joinPayment}
        ${whereClause}
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...params);
    } else {
      const stmt = db.prepare(`
        SELECT TO_CHAR(${dateCol}, 'YYYY-MM-DD') as sale_date, 
               COALESCE(${paymentMethod ? 'SUM(pay.amount)' : 'SUM(o.total)'}, 0) as total, 
               COUNT(DISTINCT ${paymentMethod ? 'pay.id' : 'o.id'}) as quantity
        FROM orders o
        ${joinPayment}
        ${whereClause}
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...params);
    }
  }

  async getSalesByProduct(startDate, endDate, paymentMethod = null) {
    let params = [];
    
    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND ${dateCol} >= ? AND ${dateCol} <= ?`;
    params.push(startDate, endDate);

    const stmt = db.prepare(`
      SELECT p.id, p.name, 
             COALESCE(${paymentMethod ? 'SUM(op.total_price * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.total_price)'}, 0) as total, 
             COALESCE(${paymentMethod ? 'SUM(op.quantity * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.quantity)'}, 0) as quantity
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p_direct ON op.product_id = p_direct.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      JOIN products p ON (p_direct.id = p.id OR p_template.id = p.id)
      ${joinPayment}
      ${whereClause}
      GROUP BY p.id
      ORDER BY total DESC
    `);
    
    return await stmt.all(...params);
  }

  async getSalesBySpecificDates(dates, productId = null, paymentMethod = null) {
    if (!dates || dates.length === 0) return [];
    
    let params = [];
    const placeholders = dates.map(() => '?').join(',');
    
    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND TO_CHAR(${dateCol}, 'YYYY-MM-DD') IN (${placeholders})`;
    params.push(...dates);
    
    if (productId) {
      whereClause += ` AND (op.product_id = ? OR pt.product_id = ?)`;
      params.push(productId, productId);
    }

    if (productId) {
      const stmt = db.prepare(`
        SELECT TO_CHAR(${dateCol}, 'YYYY-MM-DD') as sale_date, 
               COALESCE(${paymentMethod ? 'SUM(op.total_price * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.total_price)'}, 0) as total, 
               COALESCE(${paymentMethod ? 'SUM(op.quantity * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.quantity)'}, 0) as quantity
        FROM orders o
        JOIN order_products op ON o.id = op.order_id
        LEFT JOIN product_templates pt ON op.template_id = pt.id
        ${joinPayment}
        ${whereClause}
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...params);
    } else {
      const stmt = db.prepare(`
        SELECT TO_CHAR(${dateCol}, 'YYYY-MM-DD') as sale_date, 
               COALESCE(${paymentMethod ? 'SUM(pay.amount)' : 'SUM(o.total)'}, 0) as total, 
               COUNT(DISTINCT ${paymentMethod ? 'pay.id' : 'o.id'}) as quantity
        FROM orders o
        ${joinPayment}
        ${whereClause}
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...params);
    }
  }

  async getSalesByProductForDates(dates, paymentMethod = null) {
    if (!dates || dates.length === 0) return [];
    
    let params = [];
    const placeholders = dates.map(() => '?').join(',');
    
    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND TO_CHAR(${dateCol}, 'YYYY-MM-DD') IN (${placeholders})`;
    params.push(...dates);

    const stmt = db.prepare(`
      SELECT p.id, p.name, 
             COALESCE(${paymentMethod ? 'SUM(op.total_price * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.total_price)'}, 0) as total, 
             COALESCE(${paymentMethod ? 'SUM(op.quantity * (CAST(pay.amount AS FLOAT) / NULLIF(CAST(o.total AS FLOAT), 0)))' : 'SUM(op.quantity)'}, 0) as quantity
      FROM orders o
      JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p_direct ON op.product_id = p_direct.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      JOIN products p ON (p_direct.id = p.id OR p_template.id = p.id)
      ${joinPayment}
      ${whereClause}
      GROUP BY p.id
      ORDER BY total DESC
    `);
    
    return await stmt.all(...params);
  }

  async getAvailableYears() {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT year FROM (
          SELECT TO_CHAR(date, 'YYYY') as year FROM orders WHERE active = 1 AND date IS NOT NULL
          UNION
          SELECT TO_CHAR(date, 'YYYY') as year FROM payments WHERE date IS NOT NULL
        ) all_years
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
      SELECT DISTINCT sale_date FROM (
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as sale_date FROM orders WHERE active = 1 AND TO_CHAR(date, 'YYYY') = ?
        UNION
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as sale_date FROM payments WHERE TO_CHAR(date, 'YYYY') = ?
      ) all_dates
      ORDER BY sale_date ASC
    `);
    
    return (await stmt.all(year.toString(), year.toString())).map(r => r.sale_date);
  }
}

module.exports = new StatsRepository();
