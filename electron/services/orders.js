const db = require('../db');

// FUNCIONES DE CONSULTA DE ÓRDENES

function getAllOrders() {
  const stmt = db.prepare(`
    SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
          o.estimated_delivery_date, o.status, o.total, o.notes,
          c.name as client_name, c.phone as client_phone,
          u.username as user_username,
          ue.username as edited_by_username
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.edited_by = ue.id
    WHERE o.status NOT IN ('completado', 'cancelado')
    ORDER BY o.date DESC
  `);
  
  const orders = stmt.all();
  return orders.map(formatOrder);
}

function getOrderById(id) {
  const orderData = db.prepare(`
    SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
          o.estimated_delivery_date, o.status, o.total, o.notes,
          c.name as client_name, c.phone as client_phone,
          u.username as user_username,
          ue.username as edited_by_username
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.edited_by = ue.id
    WHERE o.id = ?
  `).get(id);

  if (!orderData) return null;

  const orderProducts = db.prepare(`
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
  `).all(id);

  return { ...formatOrder(orderData), orderProducts };
}

function getOrdersByClientId(clientId) {
  const stmt = db.prepare(`
    SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
          o.estimated_delivery_date, o.status, o.total, o.notes,
          c.name as client_name, c.phone as client_phone,
          u.username as user_username,
          ue.username as edited_by_username
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.edited_by = ue.id
    WHERE o.client_id = ?
    ORDER BY o.date DESC
  `);

  const orders = stmt.all(clientId);
  return orders.map(formatOrder);
}

function getSales() {
  const stmt = db.prepare(`
    SELECT o.id, o.client_id, o.user_id, o.edited_by, o.date, 
          o.estimated_delivery_date, o.status, o.total, o.notes,
          c.name as client_name, c.phone as client_phone,
          u.username as user_username,
          ue.username as edited_by_username
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.edited_by = ue.id
    WHERE o.status = 'completado'
    ORDER BY o.date DESC
  `);

  const sales = stmt.all();
  return sales.map(formatOrder);
}

// VALIDACIÓN DE ESTADO

const VALID_ORDER_STATUSES = ['pendiente', 'en proceso', 'completado', 'cancelado'];

function validateOrderStatus(status) {
  return VALID_ORDER_STATUSES.includes(status) ? status : 'pendiente';
}

// CREACIÓN Y ACTUALIZACIÓN DE ÓRDENES

function createOrder({ client_id, user_id, date, estimated_delivery_date, status, products, notes }) {
  if (!products || !products.length) {
    throw new Error("Una orden debe contener al menos un producto");
  }

  const validatedStatus = validateOrderStatus(status);

  const stmt = db.prepare(`
    INSERT INTO orders (client_id, user_id, date, estimated_delivery_date, status, total, notes)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `);
  const result = stmt.run(client_id, user_id, date, estimated_delivery_date, validatedStatus, notes || null);
  const orderId = result.lastInsertRowid;

  const insertProductStmt = db.prepare(`
    INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertProducts = db.transaction((products) => {
    for (const product of products) {
      const totalPrice = product.quantity * product.unit_price;
      
      insertProductStmt.run(
        orderId,
        product.product_id,
        product.template_id || null,
        product.quantity,
        product.unit_price,
        totalPrice
      );
    }
  });

  insertProducts(products);
  recalculateOrderTotal(orderId);

  return getOrderById(orderId);
}

function updateOrder(id, { estimated_delivery_date, status, notes, edited_by }) {
  const validatedStatus = status ? validateOrderStatus(status) : status;

  const stmt = db.prepare(`
    UPDATE orders
    SET estimated_delivery_date = ?, status = ?, notes = ?, edited_by = ?
    WHERE id = ?
  `);
  const result = stmt.run(estimated_delivery_date, validatedStatus, notes, edited_by, id);

  return result.changes > 0
    ? { success: true, message: 'Orden actualizada exitosamente', data: getOrderById(id) }
    : { success: false, message: 'Orden no encontrada' };
}

function deleteOrder(id) {
  const result = db.prepare(` UPDATE orders SET status = 'cancelado' WHERE id = ?`).run(id);

  return result.changes > 0
    ? { success: true, message: 'Orden eliminada exitosamente' }
    : { success: false, message: 'Orden no encontrada' };
}

// UTILIDADES

function recalculateOrderTotal(orderId) {
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

function formatOrder(orderData) {
  return {
    id: orderData.id,
    client_id: orderData.client_id,
    user_id: orderData.user_id,
    edited_by: orderData.edited_by,
    date: orderData.date,
    estimated_delivery_date: orderData.estimated_delivery_date,
    status: orderData.status,
    total: orderData.total,
    notes: orderData.notes,
    client: {
      id: orderData.client_id,
      name: orderData.client_name,
      phone: orderData.client_phone
    },
    user: {
      id: orderData.user_id,
      username: orderData.user_username
    },
    editedByUser: orderData.edited_by ? {
      id: orderData.edited_by,
      username: orderData.edited_by_username
    } : undefined
  };
}


module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByClientId,
  getSales,
  createOrder,
  updateOrder,
  deleteOrder,
  recalculateOrderTotal,
  validateOrderStatus,
};
