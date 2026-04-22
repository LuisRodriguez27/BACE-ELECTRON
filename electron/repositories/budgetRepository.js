const db = require('../db');
const Budget = require('../domain/budget');

class BudgetRepository {
  async findAll() {
    const budgets = await db.getAll(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.active = true AND b.converted_to_order = 0
      ORDER BY b.id DESC 
    `);

    return await Promise.all(budgets.map(async budget => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
  }

  async findById(id) {
    const budgetData = await db.getOne(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.id = $1 AND b.active = true
    `, [id]);

    if (!budgetData) return null;

    const budgetProducts = await this.getBudgetProducts(budgetData.id);
    return new Budget({ ...budgetData, budgetProducts });
  }

  async findByClientId(clientId) {
    const budgets = await db.getAll(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.client_id = $1 AND b.active = true
      ORDER BY b.id DESC
    `, [clientId]);

    return await Promise.all(budgets.map(async budget => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
  }

  async findAllPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    
    // Construir la condición de búsqueda
    let searchCondition = '';
    let searchParams = [];
    let paramIndex = 1;
    
    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `
        AND (
          CAST(b.id AS TEXT) ILIKE $${paramIndex}
          OR c.name ILIKE $${paramIndex}
          OR c.phone ILIKE $${paramIndex}
          OR EXISTS (
            SELECT 1 FROM budget_products bp
            LEFT JOIN products p ON bp.product_id = p.id
            LEFT JOIN product_templates pt ON bp.template_id = pt.id
            LEFT JOIN products pt_p ON pt.product_id = pt_p.id
            WHERE bp.budget_id = b.id
            AND (
              p.name ILIKE $${paramIndex} 
              OR p.description ILIKE $${paramIndex}
              OR pt.description ILIKE $${paramIndex}
              OR pt_p.name ILIKE $${paramIndex}
            )
          )
        )
      `;
      searchParams = [term];
      paramIndex = 2;
    }
    
    // Obtener total de registros con búsqueda
    const countQuery = `
      SELECT COUNT(*) as total
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      WHERE b.active = true AND b.converted_to_order = 0 ${searchCondition}
    `;
    const countResult = await db.getOne(countQuery, searchParams);
    const total = countResult.total;
    
    // Obtener registros paginados con búsqueda
    const dataQuery = `
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.active = true AND b.converted_to_order = 0 ${searchCondition}
      ORDER BY b.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const budgets = await db.getAll(dataQuery, [...searchParams, limit, offset]);
    
    const budgetsWithProducts = await Promise.all(budgets.map(async budget => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
    
    return {
      data: budgetsWithProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      searchTerm
    };
  }

  async create(budgetData) {
    if (!budgetData.items || !Array.isArray(budgetData.items) || budgetData.items.length === 0) {
      throw new Error('El presupuesto debe tener al menos un producto o plantilla.');
    }

    await this.validateBudgetItems(budgetData.items);

    const transaction = db.transaction(async () => {
      const result = await db.execute(`
        INSERT INTO budgets (client_id, user_id, date, total, converted_to_order)
        VALUES ($1, $2, $3, $4, 0)
      `, [
        budgetData.client_id,
        budgetData.user_id,
        budgetData.date,
        budgetData.total || 0
      ]);
      const budgetId = result.lastInsertRowid;

      await this.addItemsToBudget(budgetId, budgetData.items);

      await this.recalculateTotal(budgetId);

      return budgetId;
    });

    const budgetId = await transaction();
    return await this.findById(budgetId);
  }

  async update(id, budgetData) {
    const existingBudget = await this.findById(id);
    if (!existingBudget) {
      throw new Error('El presupuesto no existe');
    }

    if (existingBudget.converted_to_order) {
      throw new Error('No se puede editar un presupuesto que ya ha sido convertido a orden');
    }

    const fieldsToUpdate = {};
    if (budgetData.date !== undefined) fieldsToUpdate.date = budgetData.date;
    if (budgetData.client_id !== undefined) fieldsToUpdate.client_id = budgetData.client_id;
    if (budgetData.edited_by !== undefined) fieldsToUpdate.edited_by = budgetData.edited_by;

    const fieldEntries = Object.entries(fieldsToUpdate);

    if (fieldEntries.length > 0) {
      const values = fieldEntries.map(([, value]) => value);
      const setClause = fieldEntries.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
      
      values.push(id);
      await db.execute(`
        UPDATE budgets
        SET ${setClause}
        WHERE id = $${values.length} AND active = true
      `, values);
    }

    if (budgetData.items && Array.isArray(budgetData.items)) {
      await this.validateBudgetItems(budgetData.items);
      await db.execute('DELETE FROM budget_products WHERE budget_id = $1', [id]);
      await this.addItemsToBudget(id, budgetData.items);
      await this.recalculateTotal(id);
    }

    return await this.findById(id);
  }

  async validateBudgetItems(items) {
    for (const item of items) {
      const hasProduct = item.product_id !== null && item.product_id !== undefined;
      const hasTemplate = item.template_id !== null && item.template_id !== undefined;
      
      if (!hasProduct && !hasTemplate) {
        throw new Error('Cada item debe tener al menos un product_id o template_id.');
      }

      if (hasProduct && hasTemplate) {
        throw new Error('Un item no puede tener tanto product_id como template_id');
      }

      // Verificar que tenga cantidad y precio
      if (!item.quantity || item.quantity <= 0) {
        throw new Error('Cada item debe tener una cantidad válida mayor a 0');
      }

      if (!item.unit_price || item.unit_price <= 0) {
        throw new Error('Cada item debe tener un precio unitario válido mayor a 0');
      }
    }
  }

  async addItemsToBudget(budgetId, items) {
    for (const item of items) {
      const productId = item.product_id || null;
      const templateId = item.template_id || null;
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = quantity * unitPrice;

      await db.execute(`
        INSERT INTO budget_products (budget_id, product_id, template_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [budgetId, productId, templateId, quantity, unitPrice, totalPrice]);
    }
  }

  async delete(budgetId) {
    const result = await db.execute(`
      UPDATE budgets SET active = false WHERE id = $1
    `, [budgetId]);
    return result.changes > 0;
  }

  async transformToOrder(budgetId, userId) {
    // Obtener el presupuesto completo
    const budget = await this.findById(budgetId);
    if (!budget) {
      throw new Error('El presupuesto no existe');
    }

    // Verificar que el presupuesto no haya sido convertido ya
    if (budget.converted_to_order) {
      throw new Error('Este presupuesto ya fue convertido a orden');
    }

    // Obtener los productos del presupuesto
    const budgetProducts = await this.getBudgetProducts(budgetId);
    if (!budgetProducts || budgetProducts.length === 0) {
      throw new Error('El presupuesto no tiene productos');
    }

    const transaction = db.transaction(async () => {
      // Crear la orden con los mismos datos del presupuesto
      const orderResult = await db.execute(`
        INSERT INTO orders (client_id, user_id, date, status, total, notes, created_from_budget_id)
        VALUES ($1, $2, $3, 'Revision', $4, $5, $6)
      `, [
        budget.client_id,
        userId,
        new Date().toISOString(),
        budget.total,
        `Convertido desde presupuesto #${budgetId}`,
        budgetId
      ]);

      const orderId = orderResult.lastInsertRowid;

      // Copiar los productos del presupuesto a la orden
      for (const item of budgetProducts) {
        await db.execute(`
          INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          orderId,
          item.product_id || null,
          item.template_id || null,
          item.quantity,
          item.unit_price,
          item.total_price
        ]);
      }

      // Marcar el presupuesto como convertido
      await db.execute(`
        UPDATE budgets
        SET converted_to_order = 1, converted_to_order_id = $1
        WHERE id = $2
      `, [orderId, budgetId]);

      return orderId;
    });

    const orderId = await transaction();
    
    // Retornar el ID de la orden creada
    return orderId;
  }

  async getBudgetProducts(budgetId) {
    return await db.getAll(`
      SELECT 
        bp.*,
        p.name as product_name, 
        p.serial_number,
        p.price as product_price,
        p.description as product_description,
        pt.width as template_width,
        pt.height as template_height,
        pt.colors as template_colors,
        pt.position as template_position,
        pt.texts as template_texts,
        pt.description as template_description,
        pt.final_price as template_final_price,
        u.username as template_created_by_username
      FROM budget_products bp
      LEFT JOIN products p ON bp.product_id = p.id
      LEFT JOIN product_templates pt ON bp.template_id = pt.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE bp.budget_id = $1
      ORDER BY bp.id
    `, [budgetId]);
  }

  async recalculateTotal(budgetId) {
    const totalQuery = await db.getOne(`
      SELECT SUM(total_price) as total
      FROM budget_products
      WHERE budget_id = $1
    `, [budgetId]);

    const newTotal = totalQuery.total || 0;

    await db.execute(`
      UPDATE budgets
      SET total = $1
      WHERE id = $2
    `, [newTotal, budgetId]);

    return newTotal;
  }

  async getNextId() {
    const result = await db.getOne(`
      SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM budgets
    `);
    
    return result.next_id;
  }

}

module.exports = new BudgetRepository();