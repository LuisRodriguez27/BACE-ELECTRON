import db from '../db';
import Budget from '../domain/budget';
import type { BudgetItem, BudgetRow, BudgetProductRow, BudgetData } from '../types/budget';

const BUDGET_SELECT = `
  SELECT b.id, b.client_id, b.user_id, b.edited_by, b.date,
         b.total, b.converted_to_order, b.active,
         c.name AS client_name, c.phone AS client_phone, c.color AS client_color,
         u.username AS user_username, ue.username AS edited_by_username
  FROM budgets b
  JOIN clients c ON b.client_id = c.id
  JOIN users u ON b.user_id = u.id
  LEFT JOIN users ue ON b.edited_by = ue.id
`;

class BudgetRepository {
  async findAll() {
    const budgets = await db.getAll<BudgetRow>(`${BUDGET_SELECT} WHERE b.active = true AND b.converted_to_order = false ORDER BY b.id DESC`);
    return await Promise.all(budgets.map(async (budget) => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
  }

  async findById(id: number) {
    const budgetData = await db.getOne<BudgetRow>(`${BUDGET_SELECT} WHERE b.id = $1 AND b.active = true`, [id]);
    if (!budgetData) return null;
    const budgetProducts = await this.getBudgetProducts(budgetData.id);
    return new Budget({ ...budgetData, budgetProducts });
  }

  async findByClientId(clientId: number) {
    const budgets = await db.getAll<BudgetRow>(`${BUDGET_SELECT} WHERE b.client_id = $1 AND b.active = true ORDER BY b.id DESC`, [clientId]);
    return await Promise.all(budgets.map(async (budget) => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));
  }

  async findAllPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    let searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `AND (CAST(b.id AS TEXT) ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM budget_products bp LEFT JOIN products p ON bp.product_id = p.id LEFT JOIN product_templates pt ON bp.template_id = pt.id LEFT JOIN products pt_p ON pt.product_id = pt_p.id WHERE bp.budget_id = b.id AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR pt.description ILIKE $${paramIndex} OR pt_p.name ILIKE $${paramIndex})))`;
      searchParams = [term];
      paramIndex = 2;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM budgets b JOIN clients c ON b.client_id = c.id WHERE b.active = true AND b.converted_to_order = false ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10);
    const budgets = await db.getAll<BudgetRow>(`${BUDGET_SELECT} WHERE b.active = true AND b.converted_to_order = false ${searchCondition} ORDER BY b.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    const budgetsWithProducts = await Promise.all(budgets.map(async (budget) => {
      const budgetProducts = await this.getBudgetProducts(budget.id);
      return new Budget({ ...budget, budgetProducts });
    }));

    return { data: budgetsWithProducts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }, searchTerm };
  }

  async create(budgetData: BudgetData) {
    const date = budgetData.date ? new Date(budgetData.date).toISOString() : new Date().toISOString();
    const result = await db.execute(`INSERT INTO budgets (client_id, user_id, date, total, converted_to_order, active) VALUES ($1, $2, $3, 0, false, true)`, [budgetData.client_id, budgetData.user_id, date]);
    const budgetId = result.lastInsertRowid!;

    if (budgetData.items && Array.isArray(budgetData.items)) {
      await this.validateBudgetItems(budgetData.items);
      await this.addItemsToBudget(budgetId, budgetData.items);
      await this.recalculateTotal(budgetId);
    }

    return await this.findById(budgetId);
  }

  async update(id: number, budgetData: BudgetData) {
    const existingBudget = await this.findById(id);
    if (!existingBudget) throw new Error('El presupuesto no existe');
    if (existingBudget.converted_to_order) throw new Error('No se puede editar un presupuesto que ya ha sido convertido a orden');

    const fieldsToUpdate: Partial<BudgetRow> = {};
    if (budgetData.date !== undefined) fieldsToUpdate.date = budgetData.date;
    if (budgetData.client_id !== undefined) fieldsToUpdate.client_id = budgetData.client_id;
    if (budgetData.edited_by !== undefined) fieldsToUpdate.edited_by = budgetData.edited_by;

    const fieldEntries = Object.entries(fieldsToUpdate);
    if (fieldEntries.length > 0) {
      const values = fieldEntries.map(([, value]) => value);
      const setClause = fieldEntries.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
      values.push(id);
      await db.execute(`UPDATE budgets SET ${setClause} WHERE id = $${values.length} AND active = true`, values);
    }

    if (budgetData.items && Array.isArray(budgetData.items)) {
      await this.validateBudgetItems(budgetData.items);
      await db.execute('DELETE FROM budget_products WHERE budget_id = $1', [id]);
      await this.addItemsToBudget(id, budgetData.items);
      await this.recalculateTotal(id);
    }

    return await this.findById(id);
  }

  async validateBudgetItems(items: BudgetItem[]): Promise<void> {
    for (const item of items) {
      const hasProduct = item.product_id !== null && item.product_id !== undefined;
      const hasTemplate = item.template_id !== null && item.template_id !== undefined;
      if (!hasProduct && !hasTemplate) throw new Error('Cada item debe tener al menos un product_id o template_id.');
      if (hasProduct && hasTemplate) throw new Error('Un item no puede tener tanto product_id como template_id');
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      if (isNaN(quantity) || quantity <= 0) throw new Error('Cada item debe tener una cantidad válida mayor a 0');
      if (isNaN(unitPrice) || unitPrice <= 0) throw new Error('Cada item debe tener un precio unitario válido mayor a 0');
    }
  }

  async addItemsToBudget(budgetId: number, items: BudgetItem[]): Promise<void> {
    for (const item of items) {
      const quantity = parseFloat(String(item.quantity));
      const unitPrice = parseFloat(String(item.unit_price));
      const totalPrice = quantity * unitPrice;
      await db.execute(`INSERT INTO budget_products (budget_id, product_id, template_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)`, [budgetId, item.product_id || null, item.template_id || null, quantity, unitPrice, totalPrice]);
    }
  }

  async delete(budgetId: number): Promise<boolean> {
    const result = await db.execute(`UPDATE budgets SET active = false WHERE id = $1`, [budgetId]);
    return (result.changes ?? 0) > 0;
  }

  async transformToOrder(budgetId: number, userId: number): Promise<number> {
    const budget = await this.findById(budgetId);
    if (!budget) throw new Error('El presupuesto no existe');
    if (budget.converted_to_order) throw new Error('Este presupuesto ya fue convertido a orden');

    const budgetProducts = await this.getBudgetProducts(budgetId);
    if (!budgetProducts || budgetProducts.length === 0) throw new Error('El presupuesto no tiene productos');

    const orderResult = await db.execute(`INSERT INTO orders (client_id, user_id, date, status, total, notes, created_from_budget_id) VALUES ($1, $2, $3, 'Revision', $4, $5, $6)`, [budget.client_id, userId, new Date().toISOString(), budget.total, `Convertido desde presupuesto #${budgetId}`, budgetId]);
    const orderId = orderResult.lastInsertRowid!;
    for (const item of budgetProducts) {
      await db.execute(`INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)`, [orderId, item.product_id || null, item.template_id || null, item.quantity, item.unit_price, item.total_price]);
    }
    await db.execute(`UPDATE budgets SET converted_to_order = true, converted_to_order_id = $1 WHERE id = $2`, [orderId, budgetId]);
    return orderId;
  }

  async getBudgetProducts(budgetId: number): Promise<BudgetProductRow[]> {
    return await db.getAll<BudgetProductRow>(`
      SELECT bp.*,
             p.name as product_name, p.serial_number, p.price as product_price, p.description as product_description,
             pt.width as template_width, pt.height as template_height, pt.colors as template_colors,
             pt.position as template_position, pt.texts as template_texts, pt.description as template_description,
             pt.final_price as template_final_price, u.username as template_created_by_username,
             p_template.name as template_base_product_name
      FROM budget_products bp
      LEFT JOIN products p ON bp.product_id = p.id
      LEFT JOIN product_templates pt ON bp.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE bp.budget_id = $1 ORDER BY bp.id
    `, [budgetId]);
  }

  async recalculateTotal(budgetId: number): Promise<number> {
    const totalQuery = await db.getOne<{ total: number | null }>(`SELECT SUM(total_price) as total FROM budget_products WHERE budget_id = $1`, [budgetId]);
    const newTotal = totalQuery?.total || 0;
    await db.execute(`UPDATE budgets SET total = $1 WHERE id = $2`, [newTotal, budgetId]);
    return newTotal;
  }

  async getNextId(): Promise<number> {
    const result = await db.getOne<{ next_id: number }>(`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM budgets`);
    return result!.next_id;
  }
}

export default new BudgetRepository();
