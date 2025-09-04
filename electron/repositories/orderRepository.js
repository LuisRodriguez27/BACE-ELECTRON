const db = require('../db');
const Order = require('../domain/order');

class OrderRepository {

  findAll() {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.active = 1 AND o.status NOT IN ('completado', 'cancelado')
      ORDER BY o.date DESC
    `);
    
    const orders = stmt.all();
    return orders.map(order => new Order(order));
  }

  findById(id) {
    const orderData = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.id = ? AND o.active = 1
    `).get(id);

    if (!orderData) return null;

    const orderProducts = this.getOrderProducts(id);

    return new Order({ ...orderData, orderProducts });
  }

  findByClientId(clientId) {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.client_id = ? AND o.active = 1
      ORDER BY o.date DESC
    `);

    const orders = stmt.all(clientId);
    return orders.map(order => new Order(order));
  }

  findCompleted() {
    const stmt = db.prepare(`
      SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
            o.estimated_delivery_date, o.status, o.total, o.notes, o.active,
            c.name as client_name, c.phone as client_phone,
            u.username as user_username,
            ue.username as edited_by_username
      FROM orders o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN users ue ON o.edited_by = ue.id
      WHERE o.active = 1 AND o.status = 'completado'
      ORDER BY o.date DESC
    `);
    
    const orders = stmt.all();
    return orders.map(order => new Order(order));
  }

  create(orderData) {
    // Crear la orden con total = 0 temporalmente
    const stmt = db.prepare(`
      INSERT INTO orders (client_id, user_id, date, estimated_delivery_date, status, total, notes)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);
    const result = stmt.run(
      orderData.client_id,
      orderData.user_id,
      orderData.date,
      orderData.estimated_delivery_date || null,
      orderData.status || 'pendiente',
      orderData.notes || null
    );

    const orderId = result.lastInsertRowid;

    // Insertar productos si se proporcionan
    if (orderData.products && orderData.products.length > 0) {
      this.addProductsToOrder(orderId, orderData.products);
    }

    // Recalcular total
    this.recalculateTotal(orderId);

    return this.findById(orderId);
  }

  update(id, orderData) {
    const stmt = db.prepare(`
      UPDATE orders
      SET estimated_delivery_date = ?, status = ?, notes = ?, edited_by = ?
      WHERE id = ? AND active = 1
    `);
    const result = stmt.run(
      orderData.estimated_delivery_date || null,
      orderData.status || null,
      orderData.notes || null,
      orderData.edited_by || null,
      id
    );

    return result.changes > 0;
  }

  delete(id) {
    const stmt = db.prepare('UPDATE orders SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  getOrderProducts(orderId) {
    const stmt = db.prepare(`
      SELECT 
        op.*,
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
        u.username as template_created_by_username
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      LEFT JOIN product_templates pt ON op.template_id = pt.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE op.order_id = ?
      ORDER BY op.id
    `);

    return stmt.all(orderId);
  }

  // Recalcular total
  recalculateTotal(orderId) {
    const totalQuery = db.prepare(`
      SELECT SUM(unit_price * quantity) as total
      FROM order_products
      WHERE order_id = ?
    `).get(orderId);

    const newTotal = totalQuery.total || 0;

    db.prepare(`
      UPDATE orders
      SET total = ?
      WHERE id = ?
    `).run(newTotal, orderId);

    return newTotal;
  }
  
}

module.exports = new OrderRepository();
