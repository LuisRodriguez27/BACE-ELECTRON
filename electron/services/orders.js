const db = require('../db');

function getAllOrders() {
	const stmt = db.prepare('SELECT * FROM orders');
	return stmt.all();
}

function getOrderById(id) {
	const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
	return stmt.get(id);
}

function createOrder(clientId, userId, estimatedDeliveryDate, status = 'pending', total = 0) {
	const stmt = db.prepare('INSERT INTO orders (client_id, user_id, estimated_delivery_date, status, total) VALUES (?, ?, ?, ?, ?)');
	const info = stmt.run(clientId, userId, estimatedDeliveryDate, status, total);
	return { id: info.lastInsertRowid };
}

function updateOrder(id, clientId, userId, estimatedDeliveryDate, status, total) {
	const stmt = db.prepare('UPDATE orders SET client_id = ?, user_id = ?, estimated_delivery_date = ?, status = ?, total = ? WHERE id = ?');
	const info = stmt.run(clientId, userId, estimatedDeliveryDate, status, total, id);
	
	if (info.changes > 0) {
		return { success: true, message: 'Order updated successfully' }, getOrderById(id);
	} else {
		return { success: false, message: 'Order not found' };
	}
}

function deleteOrder(id) {
	const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
	const info = stmt.run(id);

	if (info.changes > 0) {
		return { success: true, message: 'Order deleted successfully' };
	} else {
		return { success: false, message: 'Order not found' };
	}
}

function addProductToOrder(orderId, productId, quantity) {
	const stmt = db.prepare('INSERT INTO order_products (order_id, products_id, quantity) VALUES (?, ?, ?)');
	const info = stmt.run(orderId, productId, quantity);
	return { id: info.lastInsertRowid };
}

function getOrderProducts(orderId) {
	const stmt = db.prepare('SELECT * FROM order_products WHERE order_id = ?');
	return stmt.all(orderId);
}

function updateOrderProduct(id, orderId, productId, quantity) {
	const stmt = db.prepare('UPDATE order_products SET order_id = ?, products_id = ?, quantity = ? WHERE id = ?');
	const info = stmt.run(orderId, productId, quantity, id);
	
	if (info.changes > 0) {
		return { success: true, message: 'Order product updated successfully' }, getOrderProducts(orderId);
	} else {
		return { success: false, message: 'Order product not found' };
	}
}

function deleteOrderProduct(id) {
	const stmt = db.prepare('DELETE FROM order_products WHERE id = ?');
	const info = stmt.run(id);

	if (info.changes > 0) {
		return { success: true, message: 'Order product deleted successfully' };
	} else {
		return { success: false, message: 'Order product not found' };
	}
}

module.exports = {
	getAllOrders,
	getOrderById,
	createOrder,
	updateOrder,
	deleteOrder,
	addProductToOrder,
	getOrderProducts,
	updateOrderProduct,
	deleteOrderProduct
};