const db = require('../db');

function getAllOrders() {
	const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    ORDER BY o.date DESC
  `);
	return stmt.all();
}

function getOrderById(id) {
	const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    WHERE o.id = ?
  `).get(id);

	if (!stmt) return null;

	stmt.products = db.prepare(`
    SELECT op.*, p.name as product_name, p.serial_number
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    WHERE op.order_id = ?
  `).all(id);

	return stmt;
}

function createOrder({ client_id, user_id, estimated_delivery_date, status, total }) {
  const stmt = db.prepare(`
    INSERT INTO orders (client_id, user_id, estimated_delivery_date, status, total)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(client_id, user_id, estimated_delivery_date, status || "pending", total || 0);
  return getOrderById(result.lastInsertRowid);
}

function updateOrder(id, { client_id, user_id, estimated_delivery_date, status, total }) {
	const stmt = db.prepare(`
		UPDATE orders
		SET client_id = ?, user_id = ?, estimated_delivery_date = ?, status = ?, total = ?
		WHERE id = ?
	`);
	const result = stmt.run(client_id, user_id, estimated_delivery_date, status, total, id);

	if (result.changes > 0) {
		return { success: true, menssage: 'Orden actualizada exitosamente' }, getOrderById(id);
	} else {
		return null;
	}
}

function deleteOrder(id) {
  // Primero eliminar productos asociados
  db.prepare('DELETE FROM order_products WHERE order_id = ?').run(id);
  // Luego eliminar la orden
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0
    ? { success: true, message: 'Orden eliminada exitosamente' }
    : { success: false, message: 'Orden no encontrada' };
}



// Funciones para agregar productos a una orden
// 1️⃣ Agregar un producto (ej: 1 toalla)
function addProductToOrder(orderId, { products_id, quantity, price, height, width, position, colors, description }) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, products_id, quantity, price, height, width, position, JSON.stringify(colors || []), description);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid);
}

// 2️⃣ Agregar varios productos de una vez (ej: 35 toallas)
function addProductsToOrder(orderId, products) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((products) => {
    for (const p of products) {
      stmt.run(orderId, p.products_id, p.quantity, p.price, p.height, p.width, p.position, JSON.stringify(p.colors || []), p.description);
    }
  });
  insertMany(products);
  return getProductsToOrder(orderId);
}

// 3️⃣ Editar cantidad (ej: cambiar 35 → 15)
function updateProductQuantity(orderProductId, newQuantity) {
  db.prepare(`
    UPDATE order_products
    SET quantity = ?
    WHERE id = ?
  `).run(newQuantity, orderProductId);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
}

// 4️⃣ Editar todos los datos de un producto dentro de una orden
function updateProductInOrder(orderProductId, { quantity, price, height, width, position, colors, description }) {
  db.prepare(`
    UPDATE order_products 
    SET quantity = ?, price = ?, height = ?, width = ?, position = ?, colors = ?, description = ?
    WHERE id = ?
  `).run(quantity, price, height, width, position, JSON.stringify(colors || []), description, orderProductId);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
}

// 5️⃣ Eliminar un solo producto de la orden 
function removeProductFromOrder(orderProductId) {
  return db.prepare("DELETE FROM order_products WHERE id = ?").run(orderProductId);
}

// 6️⃣ Eliminar todos los productos de una orden
function clearProductsFromOrder(orderId) {
  return db.prepare("DELETE FROM order_products WHERE order_id = ?").run(orderId);
}

// 7️⃣ Obtener todos los productos de una orden
function getProductsToOrder(orderId) {
  return db.prepare(`
    SELECT op.*, p.name as product_name, p.serial_number
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    WHERE op.order_id = ?
  `).all(orderId);
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  addProductToOrder,
  addProductsToOrder,
  updateProductQuantity,
  updateProductInOrder,
  removeProductFromOrder,
  clearProductsFromOrder,
  getProductsToOrder
};