const db = require('../db');
const Budget = require('../domain/budget');

class BudgetRepository {
  async findAll() {
    const stmt = db.prepare(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.active = 1 AND b.converted_to_order = 0
      ORDER BY b.id DESC 
    `);

    const budgets = await stmt.all();
    return await Promise.all(budgets.map(async budget => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
  }

  async findById(id) {
    const budgetData = await db.prepare(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.id = ? AND b.active = 1
    `).get(id);

    if (!budgetData) return null;

    const budgetProducts = await this.getBudgetProducts(budgetData.id);
    return new Budget({ ...budgetData, budgetProducts });
  }

  async findByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date, 
            b.total, b.converted_to_order, b.active,
            c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
            u.username AS user_username,
            ue.username AS edited_by_username
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users ue ON b.edited_by = ue.id
      WHERE b.client_id = ? AND b.active = 1
      ORDER BY b.id DESC
    `);

    const budgets = await stmt.all(clientId);
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
    
    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `
        AND (
          CAST(b.id AS TEXT) ILIKE ?
          OR c.name ILIKE ?
          OR c.phone ILIKE ?
          OR EXISTS (
            SELECT 1 FROM budget_products bp
            LEFT JOIN products p ON bp.product_id = p.id
            LEFT JOIN product_templates pt ON bp.template_id = pt.id
            LEFT JOIN products pt_p ON pt.product_id = pt_p.id
            WHERE bp.budget_id = b.id
            AND (
              p.name ILIKE ? 
              OR p.description ILIKE ?
              OR pt.description ILIKE ?
              OR pt_p.name ILIKE ?
            )
          )
        )
      `;
      searchParams = [term, term, term, term, term, term, term];
    }
    
    // Obtener total de registros con búsqueda
    const countQuery = `
      SELECT COUNT(*) as total
      FROM budgets b
      JOIN clients c ON b.client_id = c.id
      WHERE b.active = 1 AND b.converted_to_order = 0 ${searchCondition}
    `;
    const countStmt = db.prepare(countQuery);
    const { total } = await countStmt.get(...searchParams);
    
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
      WHERE b.active = 1 AND b.converted_to_order = 0 ${searchCondition}
      ORDER BY b.id DESC
      LIMIT ? OFFSET ?
    `;
    const stmt = db.prepare(dataQuery);
    const budgets = await stmt.all(...searchParams, limit, offset);
    
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
      const orderStmt = db.prepare(`
        INSERT INTO budgets (client_id, user_id, date, total, converted_to_order)
        VALUES (?, ?, ?, ?, 0)
      `);
      const result = await orderStmt.run(
        budgetData.client_id,
        budgetData.user_id,
        budgetData.date,
        budgetData.total || 0
      );
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
      const setClause = fieldEntries.map(([key]) => `${key} = ?`).join(', ');
      const values = fieldEntries.map(([, value]) => value);
      
      const stmt = db.prepare(`
        UPDATE budgets
        SET ${setClause}
        WHERE id = ? AND active = 1
      `);
      
      await stmt.run(...values, id);
    }

    if (budgetData.items && Array.isArray(budgetData.items)) {
      await this.validateBudgetItems(budgetData.items);
      await db.prepare('DELETE FROM budget_products WHERE budget_id = ?').run(id);
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
    const stmt = db.prepare(`
      INSERT INTO budget_products (budget_id, product_id, template_id, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const productId = item.product_id || null;
      const templateId = item.template_id || null;
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const totalPrice = quantity * unitPrice;

      await stmt.run(budgetId, productId, templateId, quantity, unitPrice, totalPrice);
    }
  }

  async delete(budgetId) {
    const stmt = db.prepare(`
      UPDATE budgets SET active = 0 WHERE id = ?
    `);
    const result = await stmt.run(budgetId);
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
      const orderStmt = db.prepare(`
        INSERT INTO orders (client_id, user_id, date, status, total, notes, created_from_budget_id)
        VALUES (?, ?, ?, 'Revision', ?, ?, ?)
      `);
      
      const orderResult = await orderStmt.run(
        budget.client_id,
        userId,
        new Date().toISOString(),
        budget.total,
        `Convertido desde presupuesto #${budgetId}`,
        budgetId
      );

      const orderId = orderResult.lastInsertRowid;

      // Copiar los productos del presupuesto a la orden
      const orderProductStmt = db.prepare(`
        INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const item of budgetProducts) {
        await orderProductStmt.run(
          orderId,
          item.product_id || null,
          item.template_id || null,
          item.quantity,
          item.unit_price,
          item.total_price
        );
      }

      // Marcar el presupuesto como convertido
      const updateBudgetStmt = db.prepare(`
        UPDATE budgets
        SET converted_to_order = 1, converted_to_order_id = ?
        WHERE id = ?
      `);
      await updateBudgetStmt.run(orderId, budgetId);

      return orderId;
    });

    const orderId = await transaction();
    
    // Retornar el ID de la orden creada
    return orderId;
  }

  async getBudgetProducts(budgetId) {
    const stmt = db.prepare(`
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
      WHERE bp.budget_id = ?
      ORDER BY bp.id
    `);

    return await stmt.all(budgetId);
  }

  async recalculateTotal(budgetId) {
    const totalQuery = await db.prepare(`
      SELECT SUM(total_price) as total
      FROM budget_products
      WHERE budget_id = ?
    `).get(budgetId);

    const newTotal = totalQuery.total || 0;

    await db.prepare(`
      UPDATE budgets
      SET total = ?
      WHERE id = ?
    `).run(newTotal, budgetId);

    return newTotal;
  }

  async getNextId() {
    const result = await db.prepare(`
      SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM budgets
    `).get();
    
    return result.next_id;
  }

}

module.exports = new BudgetRepository();