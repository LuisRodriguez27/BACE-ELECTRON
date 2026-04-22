const db = require('../db');

class StatsRepository {
  /**
   * Helper para construir placeholders numerados ($1, $2, ...) para arrays de parámetros.
   * Retorna el placeholder string y el nuevo paramIndex.
   */
  _buildPlaceholders(count, startIndex) {
    const placeholders = [];
    for (let i = 0; i < count; i++) {
      placeholders.push(`$${startIndex + i}`);
    }
    return { placeholders: placeholders.join(','), nextIndex: startIndex + count };
  }

  async getSalesByDate(startDate, endDate, productId = null, paymentMethod = null, source = 'all') {
    if (productId && source !== 'all' && source !== 'orders') return [];

    let params = [];
    let paramIndex = 1;

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = true AND ${dateCol} >= $${paramIndex} AND ${dateCol} <= $${paramIndex + 1}`;
    params.push(startDate, endDate);
    paramIndex += 2;

    if (productId) {
      whereClause += ` AND (op.product_id = $${paramIndex} OR pt.product_id = $${paramIndex + 1})`;
      params.push(productId, productId);
      paramIndex += 2;
    }

    if (productId) {
      return await db.getAll(`
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
      `, params);
    } else {
      let unions = [];
      let finalParams = [];
      let finalParamIndex = 1;

      let includeOrders = source === 'all' || source === 'orders';
      let includeSimpleOrders = source === 'all' || source === 'simple';
      let includeExtra = source === 'all' || source === 'extra';

      if (includeOrders) {
        let oParams = [];
        let oParamIndex = finalParamIndex;

        let oJoinPayment = '';
        let oDateCol = 'o.date';
        if (paymentMethod) {
          oJoinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${oParamIndex}`;
          oParams.push(paymentMethod);
          oParamIndex++;
          oDateCol = 'pay.date';
        }

        let oWhereClause = `WHERE o.active = true AND ${oDateCol} >= $${oParamIndex} AND ${oDateCol} <= $${oParamIndex + 1}`;
        oParams.push(startDate, endDate);
        oParamIndex += 2;

        unions.push(`
          SELECT TO_CHAR(${oDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'pay.amount' : 'o.total'} as total
          FROM orders o
          ${oJoinPayment}
          ${oWhereClause}
         `);
        finalParams.push(...oParams);
        finalParamIndex = oParamIndex;
      }

      if (includeSimpleOrders) {
        let soParams = [];
        let soJoinPayment = '';
        let soDateCol = 'so.date';
        if (paymentMethod) {
          soJoinPayment = `JOIN simple_order_payments spay ON so.id = spay.simple_order_id AND spay.descripcion = $${finalParamIndex}`;
          soParams.push(paymentMethod);
          finalParamIndex++;
          soDateCol = 'spay.date';
        }
        let soWhereClause = `WHERE so.active = true AND (${soDateCol} AT TIME ZONE 'UTC') >= $${finalParamIndex} AND (${soDateCol} AT TIME ZONE 'UTC') <= $${finalParamIndex + 1}`;
        soParams.push(startDate, endDate);
        finalParamIndex += 2;

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
        let epWhere = `WHERE py.order_id IS NULL AND (py.date AT TIME ZONE 'UTC') >= $${finalParamIndex} AND (py.date AT TIME ZONE 'UTC') <= $${finalParamIndex + 1}`;

        if (paymentMethod) {
          finalParamIndex += 2;
          epWhere += ` AND py.descripcion = $${finalParamIndex}`;
          epParams.push(startDate, endDate, paymentMethod);
          finalParamIndex++;
        } else {
          epParams.push(startDate, endDate);
          finalParamIndex += 2;
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

      return await db.getAll(`
        SELECT sale_date, 
               COALESCE(SUM(total), 0) as total, 
               COUNT(*) as quantity
        FROM (
          ${unions.join('\n UNION ALL \n')}
        ) combined
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `, finalParams);
    }
  }

  async getSalesByProduct(startDate, endDate, paymentMethod = null, source = 'all') {
    if (source !== 'all' && source !== 'orders') return [];
    let params = [];
    let paramIndex = 1;

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
      dateCol = 'pay.date';
    }

    let whereClause = `WHERE o.active = true AND ${dateCol} >= $${paramIndex} AND ${dateCol} <= $${paramIndex + 1}`;
    params.push(startDate, endDate);
    paramIndex += 2;

    return await db.getAll(`
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
    `, params);
  }

  async getSalesBySpecificDates(dates, productId = null, paymentMethod = null, source = 'all') {
    if (!dates || dates.length === 0) return [];
    if (productId && source !== 'all' && source !== 'orders') return [];

    let params = [];
    let paramIndex = 1;

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
      dateCol = 'pay.date';
    }

    const { placeholders: datePlaceholders, nextIndex: nextIdx } = this._buildPlaceholders(dates.length, paramIndex);
    let whereClause = `WHERE o.active = true AND TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${datePlaceholders})`;
    params.push(...dates);
    paramIndex = nextIdx;

    if (productId) {
      whereClause += ` AND (op.product_id = $${paramIndex} OR pt.product_id = $${paramIndex + 1})`;
      params.push(productId, productId);
      paramIndex += 2;
    }

    if (productId) {
      return await db.getAll(`
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
      `, params);
    } else {
      let unions = [];
      let finalParams = [];
      let finalParamIndex = 1;

      let includeOrders = source === 'all' || source === 'orders';
      let includeSimpleOrders = source === 'all' || source === 'simple';
      let includeExtra = source === 'all' || source === 'extra';

      if (includeOrders) {
        let oParams = [];
        let oParamIndex = finalParamIndex;

        let oJoinPayment = '';
        let oDateCol = 'o.date';
        if (paymentMethod) {
          oJoinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${oParamIndex}`;
          oParams.push(paymentMethod);
          oParamIndex++;
          oDateCol = 'pay.date';
        }

        const { placeholders: oDatePlaceholders, nextIndex: oNextIdx } = this._buildPlaceholders(dates.length, oParamIndex);
        let oWhereClause = `WHERE o.active = true AND TO_CHAR(${oDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${oDatePlaceholders})`;
        oParams.push(...dates);
        oParamIndex = oNextIdx;

        unions.push(`
          SELECT TO_CHAR(${oDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date, 
                 ${paymentMethod ? 'pay.amount' : 'o.total'} as total
          FROM orders o
          ${oJoinPayment}
          ${oWhereClause}
         `);
        finalParams.push(...oParams);
        finalParamIndex = oParamIndex;
      }

      if (includeSimpleOrders) {
        let soParams = [];
        let soJoinPayment = '';
        let soDateCol = 'so.date';
        if (paymentMethod) {
          soJoinPayment = `JOIN simple_order_payments spay ON so.id = spay.simple_order_id AND spay.descripcion = $${finalParamIndex}`;
          soParams.push(paymentMethod);
          finalParamIndex++;
          soDateCol = 'spay.date';
        }
        const { placeholders: soDatePlaceholders, nextIndex: soNextIdx } = this._buildPlaceholders(dates.length, finalParamIndex);
        let soWhereClause = `WHERE so.active = true AND TO_CHAR(${soDateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${soDatePlaceholders})`;
        soParams.push(...dates);
        finalParamIndex = soNextIdx;

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
        const { placeholders: epDatePlaceholders, nextIndex: epNextIdx } = this._buildPlaceholders(dates.length, finalParamIndex);

        let epWhere;
        if (paymentMethod) {
          epWhere = `WHERE py.order_id IS NULL AND py.descripcion = $${epNextIdx} AND TO_CHAR(py.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${epDatePlaceholders})`;
          epParams.push(...dates, paymentMethod);
          finalParamIndex = epNextIdx + 1;
        } else {
          epWhere = `WHERE py.order_id IS NULL AND TO_CHAR(py.date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${epDatePlaceholders})`;
          epParams.push(...dates);
          finalParamIndex = epNextIdx;
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

      return await db.getAll(`
        SELECT sale_date, 
               COALESCE(SUM(total), 0) as total, 
               COUNT(*) as quantity
        FROM (
          ${unions.join('\n UNION ALL \n')}
        ) combined
        GROUP BY sale_date
        ORDER BY sale_date ASC
      `, finalParams);
    }
  }

  async getSalesByProductForDates(dates, paymentMethod = null, source = 'all') {
    if (!dates || dates.length === 0) return [];
    if (source !== 'all' && source !== 'orders') return [];

    let params = [];
    let paramIndex = 1;

    let joinPayment = '';
    let dateCol = 'o.date';
    if (paymentMethod) {
      joinPayment = `JOIN payments pay ON o.id = pay.order_id AND pay.descripcion = $${paramIndex}`;
      params.push(paymentMethod);
      paramIndex++;
      dateCol = 'pay.date';
    }

    const { placeholders: datePlaceholders, nextIndex } = this._buildPlaceholders(dates.length, paramIndex);
    let whereClause = `WHERE o.active = true AND TO_CHAR(${dateCol} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') IN (${datePlaceholders})`;
    params.push(...dates);
    paramIndex = nextIndex;

    return await db.getAll(`
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
    `, params);
  }

  async getAvailableYears() {
    try {
      const rawResults = await db.getAll(`
        SELECT DISTINCT year FROM (
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM orders WHERE active = true AND date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM payments WHERE date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM simple_orders WHERE active = true AND date IS NOT NULL
          UNION
          SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') as year FROM simple_order_payments WHERE date IS NOT NULL
        ) all_years
        ORDER BY year DESC
      `);

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
    const results = await db.getAll(`
      SELECT DISTINCT sale_date FROM (
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM orders WHERE active = true AND TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = $1
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM payments WHERE TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = $1
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM simple_orders WHERE active = true AND TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = $1
        UNION
        SELECT TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') as sale_date FROM simple_order_payments WHERE TO_CHAR(date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY') = $1
      ) all_dates
      ORDER BY sale_date ASC
    `, [strYear]);

    return results.map(r => r.sale_date);
  }
}

module.exports = new StatsRepository();
