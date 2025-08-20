const db = require('../db');

function getAllPayments() {
	const stmt = db.prepare('SELECT * FROM payments');
	return stmt.all();
}

function getPaymentById(id) {
	const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
	return stmt.get(id);
}

function createPayment(orderId, amount, description) {
	const stmt = db.prepare('INSERT INTO payments (order_id, amount, description) VALUES (?, ?, ?)');
	const info = stmt.run(orderId, amount, description);
	return { id: info.lastInsertRowid };
}

function updatePayment(id, orderId, amount, description) {
	const stmt = db.prepare('UPDATE payments SET order_id = ?, amount = ?, description = ? WHERE id = ?');
	const info = stmt.run(orderId, amount, description, id);
	
	if (info.changes > 0) {
		return { success: true, message: 'Payment updated successfully' }, getPaymentById(id);
	} else {
		return { success: false, message: 'Payment not found' };
	}
}

function getPaymentsByOrderId(orderId) {
	const stmt = db.prepare('SELECT * FROM payments WHERE order_id = ?');
	return stmt.all(orderId);
}

function deletePayment(id) {
	const stmt = db.prepare('DELETE FROM payments WHERE id = ?');
	const info = stmt.run(id);

	if (info.changes > 0) {
		return { success: true, message: 'Payment deleted successfully' };
	} else {
		return { success: false, message: 'Payment not found' };
	}
}

module.exports = {
	getAllPayments,
	getPaymentById,
	createPayment,
	updatePayment,
	getPaymentsByOrderId,
	deletePayment
};