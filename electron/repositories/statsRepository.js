const db = require('../db');

class StatsRepository {
  async getSalesByDate(startDate, endDate, productId = null, paymentMethod = null, source = 'all') {
    if (productId && source !== 'all' && source !== 'orders') return [];

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
        SELECT TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
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
      let unions = [];
      let finalParams = [];

      let includeOrders = source === 'all' || source === 'orders';
      let includeSimpleOrders = source === 'all' || source === 'simple';
      let includeExtra = source === 'all' || source === 'extra';

      if (includeOrders) {
        unions.push(`
          SELECT TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'pay.amount' : 'o.total'} as total
          FROM orders o
          ${joinPayment}
          ${whereClause}
         `);
        finalParams.push(...params);
      }

      if (includeSimpleOrders) {
        let soParams = [];
        let soJoinPayment = '';
        let soDateCol = 'so.date';
        if (paymentMethod) {
          soJoinPayment = `JOIN simple_order_payments spay ON so.id = spay.simple_order_id AND spay.descripcion = ?`;
          soParams.push(paymentMethod);
          soDateCol = 'spay.date';
        }
        let soWhereClause = `WHERE so.active = 1 AND (${soDateCol} AT TIME ZONE 'UTC') >= ? AND (${soDateCol} AT TIME ZONE 'UTC') <= ?`;
        soParams.push(startDate, endDate);

        unions.push(`
          SELECT TO_CHAR(${soDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'spay.amount' : 'so.total'} as total
          FROM simple_orders so
          ${soJoinPayment}
          ${soWhereClause}
        `);
        finalParams.push(...soParams);
      }

      if (includeExtra) {
        let epParams = [];
        let epWhere = `WHERE py.order_id IS NULL AND (py.date AT TIME ZONE 'UTC') >= ? AND (py.date AT TIME ZONE 'UTC') <= ?`;

        if (paymentMethod) {
          epWhere += ` AND py.descripcion = ?`;
          epParams.push(startDate, endDate, paymentMethod);
        } else {
          epParams.push(startDate, endDate);
        }

        unions.push(`
          SELECT TO_CHAR(py.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 py.amount as total
          FROM payments py
          ${epWhere}
        `);
        finalParams.push(...epParams);
      }

      if (unions.length === 0) return [];

      const stmt = db.prepare(`
        SELECT sale_date, 
               COALESCE(SUM(total), 0) as total, 
               COUNT(*) as quantity
        FROM (
          ${unions.join('\n UNION ALL \n')}
        ) combined
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...finalParams);
    }
  }

  async getSalesByProduct(startDate, endDate, paymentMethod = null, source = 'all') {
    if (source !== 'all' && source !== 'orders') return [];
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

  async getSalesBySpecificDates(dates, productId = null, paymentMethod = null, source = 'all') {
    if (!dates || dates.length === 0) return [];
    if (productId && source !== 'all' && source !== 'orders') return [];

    let params = [];
    const placeholders = dates.map(() => '?').join(',');

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${placeholders})`;
    params.push(...dates);

    if (productId) {
      whereClause += ` AND (op.product_id = ? OR pt.product_id = ?)`;
      params.push(productId, productId);
    }

    if (productId) {
      const stmt = db.prepare(`
        SELECT TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
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
      let unions = [];
      let finalParams = [];

      let includeOrders = source === 'all' || source === 'orders';
      let includeSimpleOrders = source === 'all' || source === 'simple';
      let includeExtra = source === 'all' || source === 'extra';

      if (includeOrders) {
        unions.push(`
          SELECT TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'pay.amount' : 'o.total'} as total
          FROM orders o
          ${joinPayment}
          ${whereClause}
         `);
        finalParams.push(...params);
      }

      if (includeSimpleOrders) {
        let soParams = [];
        let soJoinPayment = '';
        let soDateCol = 'so.date';
        if (paymentMethod) {
          soJoinPayment = `JOIN simple_order_payments spay ON so.id = spay.simple_order_id AND spay.descripcion = ?`;
          soParams.push(paymentMethod);
          soDateCol = 'spay.date';
        }
        let soWhereClause = `WHERE so.active = 1 AND TO_CHAR(${soDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${placeholders})`;
        soParams.push(...dates);

        unions.push(`
          SELECT TO_CHAR(${soDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'spay.amount' : 'so.total'} as total
          FROM simple_orders so
          ${soJoinPayment}
          ${soWhereClause}
        `);
        finalParams.push(...soParams);
      }

      if (includeExtra) {
        let epParams = [];
        let epWhere = `WHERE py.order_id IS NULL AND TO_CHAR(py.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${placeholders})`;
        if (paymentMethod) {
          epWhere += ` AND py.descripcion = ?`;
          epParams.push(paymentMethod, ...dates);
        } else {
          epParams.push(...dates);
        }

        unions.push(`
          SELECT TO_CHAR(py.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 py.amount as total
          FROM payments py
          ${epWhere}
        `);
        finalParams.push(...epParams);
      }

      if (unions.length === 0) return [];

      const stmt = db.prepare(`
        SELECT sale_date, 
               COALESCE(SUM(total), 0) as total, 
               COUNT(*) as quantity
        FROM (
          ${unions.join('\n UNION ALL \n')}
        ) combined
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `);
      return await stmt.all(...finalParams);
    }
  }

  async getSalesByProductForDates(dates, paymentMethod = null, source = 'all') {
    if (!dates || dates.length === 0) return [];
    if (source !== 'all' && source !== 'orders') return [];

    let params = [];
    const placeholders = dates.map(() => '?').join(',');

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = ?`;
      params.push(paymentMethod);
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = 1 AND TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${placeholders})`;
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
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM orders WHERE active = 1 AND date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM payments WHERE date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM simple_orders WHERE active = 1 AND date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM simple_order_payments WHERE date IS NOT NULL
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
    const strYear = year.toString();
    const stmt = db.prepare(`
      SELECT DISTINCT sale_date FROM (
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM orders WHERE active = 1 AND TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = ?
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM payments WHERE TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = ?
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM simple_orders WHERE active = 1 AND TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = ?
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM simple_order_payments WHERE TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = ?
      ) all_dates
      ORDER BY sale_date ASC
    `);

    return (await stmt.all(strYear, strYear, strYear, strYear)).map(r => r.sale_date);
  }
}

module.exports = new StatsRepository();
