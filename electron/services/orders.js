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
	const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Orden eliminada exitosamente' };
	} else {
		return { success: false, message: 'Orden no encontrada' };
	}
}



// Funciones para agregar productos a una orden
function addProductsToOrder(orderId, { products_id, quantity, price, height, width, position, description }) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, products_id, quantity, price, height, width, position, description);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid);
};

function updateProductsToOrder(orderProductId, { quantity, price, height, width, position, description }) {
  db.prepare(`
    UPDATE order_products 
    SET quantity = ?, price = ?, height = ?, width = ?, position = ?, description = ?
    WHERE id = ?
  `).run(quantity, price, height, width, position, description, orderProductId);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
};

function removeProductsToOrder(orderProductId) {
  return db.prepare("DELETE FROM order_products WHERE id = ?").run(orderProductId);
};

function getProductsToOrder(orderId) {
  return db.prepare(`
    SELECT op.*, p.name as product_name, p.serial_number
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    WHERE op.order_id = ?
  `).all(orderId);
};

module.exports = {
	getAllOrders,
	getOrderById,
	createOrder,
	updateOrder,
	deleteOrder,
	addProductsToOrder,
	updateProductsToOrder,
	removeProductsToOrder,
	getProductsToOrder
};