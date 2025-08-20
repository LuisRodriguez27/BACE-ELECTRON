const db = require('./db.js');

function getByOrderId(orderId) {
	const stmt = db.prepare(`
		SELECT p.*, op.quantity, op.price
		FROM order_products op
		JOIN products p ON op.products_id = p.id
		WHERE op.order_id = ?
	`);
	return stmt.all(orderId);
}

function getPaymentById(id) {
	const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
	return stmt.get(id);
}

function createPayment({ orderId, amount, descripcion }) {
	const stmt = db.prepare('INSERT INTO payments (order_id, amount, descripcion) VALUES (?, ?, ?)');
	const result = stmt.run(orderId, amount, descripcion);

	return db.prepare("SELECT * FROM payments WHERE id = ?").get(result.lastInsertRowid);
}

function deletePayment(id) {
	const stmt = db.prepare('DELETE FROM payments WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Pago eliminado exitosamente' };
	} else {
		return { success: false, message: 'Pago no encontrado' };
	}
}

module.exports = {
	getByOrderId,
	getPaymentById,
	createPayment,
	deletePayment
};