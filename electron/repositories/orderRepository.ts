import db from '../db';
import Order from '../domain/order';
import type { OrderItem, OrderData, OrderRow, OrderProductRow } from '../types/order';

const ORDER_SELECT = `
  SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date,
         o.estimated_delivery_date, o.status, o.total, o.notes, o.description, o.responsable, o.active,
         c.name as client_name, c.phone as client_phone, c.color as client_color,
         u.username as user_username, ue.username as edited_by_username
  FROM orders o
  JOIN clients c ON o.client_id = c.id
  JOIN users u ON o.user_id = u.id
  LEFT JOIN users ue ON o.edited_by = ue.id
`;

class OrderRepository {
  async findAll() {
    const orders = await db.getAll<OrderRow>(`${ORDER_SELECT} WHERE o.active = true AND o.status NOT IN ('Completado') ORDER BY o.id DESC`);
    return await Promise.all(orders.map(async (order) => {
      const orderProducts = await this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    }));
  }

  async findById(id: number) {
    const orderData = await db.getOne<OrderRow>(`${ORDER_SELECT} WHERE o.id = $1 AND o.active = true`, [id]);
    if (!orderData) return null;
    const orderProducts = await this.getOrderProducts(id);
    return new Order({ ...orderData, orderProducts });
  }

  async findByClientId(clientId: number) {
    const orders = await db.getAll<OrderRow>(`${ORDER_SELECT} WHERE o.client_id = $1 AND o.active = true ORDER BY o.id DESC`, [clientId]);
    return await Promise.all(orders.map(async (order) => {
      const orderProducts = await this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    }));
  }

  async findPendingForLogbook() {
    const orders = await db.getAll<OrderRow>(`${ORDER_SELECT} WHERE o.active = true AND o.status NOT IN ('Completado', 'Cancelado') ORDER BY o.id ASC`);
    return await Promise.all(orders.map(async (order) => {
      const orderProducts = await this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    }));
  }

  async findCompleted() {
    const orders = await db.getAll<OrderRow>(`${ORDER_SELECT} WHERE o.active = true AND o.status = 'Completado' ORDER BY o.id DESC`);
    return await Promise.all(orders.map(async (order) => {
      const orderProducts = await this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    }));
  }

  async findCompletedPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    let searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `AND (CAST(o.id AS TEXT) ILIKE $${paramIndex} OR o.notes ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM order_products op LEFT JOIN products p ON op.product_id = p.id LEFT JOIN product_templates pt ON op.template_id = pt.id LEFT JOIN products pt_p ON pt.product_id = pt_p.id WHERE op.order_id = o.id AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR pt.description ILIKE $${paramIndex} OR pt_p.name ILIKE $${paramIndex})))`;
      searchParams = [term];
      paramIndex = 2;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM orders o JOIN clients c ON o.client_id = c.id WHERE o.active = true AND o.status = 'Completado' ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10);
    const orders = await db.getAll<OrderRow>(`${ORDER_SELECT} WHERE o.active = true AND o.status = 'Completado' ${searchCondition} ORDER BY o.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    const ordersWithProducts = await Promise.all(orders.map(async (order) => {
      const orderProducts = await this.getOrderProducts(order.id);
      return new Order({ ...order, orderProducts });
    }));

    return { data: ordersWithProducts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }, searchTerm };
  }

  async create(orderData: OrderData & { items: OrderItem[] }) {
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw new Error('Una orden debe tener al menos un producto o plantilla');
    }
    await this.validateOrderItems(orderData.items);

    const orderResult = await db.execute(`INSERT INTO orders (client_id, user_id, date, estimated_delivery_date, status, responsable, total, notes, description) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)`, [orderData.client_id, orderData.user_id, orderData.date, orderData.estimated_delivery_date || null, orderData.status || 'Revision', orderData.responsable || 'Mostrador', orderData.notes || null, orderData.description || null]);
    const orderId = orderResult.lastInsertRowid!;
    await this.addItemsToOrder(orderId, orderData.items);
    await this.recalculateTotal(orderId);

    return await this.findById(orderId);
  }

  async validateOrderItems(items: OrderItem[]): Promise<void> {
    for (const item of items) {
      const hasProduct = item.product_id !== null && item.product_id !== undefined;
      const hasTemplate = item.template_id !== null && item.template_id !== undefined;
      if (!hasProduct && !hasTemplate) throw new Error('Cada item debe tener un product_id o template_id');
      if (hasProduct && hasTemplate) throw new Error('Un item no puede tener tanto product_id como template_id');
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      if (isNaN(quantity) || quantity <= 0) throw new Error('Cada item debe tener una cantidad válida mayor a 0');
      if (isNaN(unitPrice) || unitPrice <= 0) throw new Error('Cada item debe tener un precio unitario válido mayor a 0');
    }
  }

  async addItemsToOrder(orderId: number, items: OrderItem[]): Promise<void> {
    for (const item of items) {
      const quantity = parseFloat(String(item.quantity));
      const unitPrice = parseFloat(String(item.unit_price));
      const totalPrice = quantity * unitPrice;
      const isDelivered = item.is_delivered === true;
      const isPaid = item.is_paid === true;
      await db.execute(`INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price, is_delivered, is_paid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [orderId, item.product_id || null, item.template_id || null, quantity, unitPrice, totalPrice, isDelivered, isPaid]);
    }
  }

  async update(id: number, orderData: OrderData) {
    const existingOrder = await this.findById(id);
    if (!existingOrder) throw new Error('La orden no existe');
    if (existingOrder.isCancelled()) throw new Error('No se puede editar una orden cancelada');

    const fieldsToUpdate: Partial<OrderRow> = {};
    if (orderData.client_id !== undefined) fieldsToUpdate.client_id = orderData.client_id;
    if (orderData.date !== undefined) fieldsToUpdate.date = orderData.date;
    if (orderData.estimated_delivery_date !== undefined) fieldsToUpdate.estimated_delivery_date = orderData.estimated_delivery_date;
    if (orderData.status !== undefined) fieldsToUpdate.status = orderData.status as any;
    if (orderData.responsable !== undefined) fieldsToUpdate.responsable = orderData.responsable as any;
    if (orderData.notes !== undefined) fieldsToUpdate.notes = orderData.notes;
    if (orderData.description !== undefined) fieldsToUpdate.description = orderData.description;
    if (orderData.edited_by !== undefined) fieldsToUpdate.edited_by = orderData.edited_by;

    const fieldEntries = Object.entries(fieldsToUpdate);
    if (fieldEntries.length > 0) {
      const values: (string | number | boolean | null)[] = fieldEntries.map(([, value]) => value as any);
      const setClause = fieldEntries.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
      values.push(id);
      await db.execute(`UPDATE orders SET ${setClause} WHERE id = $${values.length} AND active = true`, values);
    }

    if (orderData.items && Array.isArray(orderData.items)) {
      await this.validateOrderItems(orderData.items);
      await db.execute('DELETE FROM order_products WHERE order_id = $1', [id]);
      await this.addItemsToOrder(id, orderData.items);
      await this.recalculateTotal(id);
    }

    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE orders SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async getOrderProducts(orderId: number): Promise<OrderProductRow[]> {
    return await db.getAll<OrderProductRow>(`
      SELECT op.*,
             p.name as product_name, p.serial_number, p.price as product_price, p.description as product_description,
             pt.width as template_width, pt.height as template_height, pt.colors as template_colors,
             pt.position as template_position, pt.texts as template_texts, pt.description as template_description,
             pt.final_price as template_final_price, u.username as template_created_by_username,
             p_template.name as template_base_product_name
      FROM order_products op
      LEFT JOIN products p ON op.product_id = p.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN products p_template ON pt.product_id = p_template.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE op.order_id = $1 ORDER BY op.id
    `, [orderId]);
  }

  async recalculateTotal(orderId: number): Promise<number> {
    const totalQuery = await db.getOne<{ total: number | null }>(`SELECT SUM(total_price) as total FROM order_products WHERE order_id = $1`, [orderId]);
    const newTotal = totalQuery?.total || 0;
    await db.execute(`UPDATE orders SET total = $1 WHERE id = $2`, [newTotal, orderId]);
    return newTotal;
  }

  async canEditOrder(orderId: number): Promise<boolean> {
    const order = await this.findById(orderId);
    return !!(order && order.canEdit());
  }

  async getOrderSummary(orderId: number) {
    const products = await this.getOrderProducts(orderId);
    return {
      totalItems: products.length,
      totalQuantity: products.reduce((sum, item) => sum + (item.quantity as number), 0),
      totalAmount: products.reduce((sum, item) => sum + (item.total_price as number), 0),
      hasProducts: products.some(item => item.product_id !== null),
      hasTemplates: products.some(item => item.template_id !== null)
    };
  }

  async addProductsToOrder(_orderId: number, _products: unknown[]): Promise<never> {
    throw new Error('No se pueden agregar productos a una orden existente. Los productos solo se pueden agregar durante la creación inicial.');
  }
}

export default new OrderRepository();
