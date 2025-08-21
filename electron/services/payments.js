const db = require('../db.js');

function getPaymentsByOrderId(orderId) {
	const stmt = db.prepare(`
		SELECT *
    FROM payments
    WHERE order_id = ?
    ORDER BY date DESC
	`);
	return stmt.all(orderId);
}

function getPaymentById(id) {
	const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
	return stmt.get(id);
}

function createPayment({ orderId, amount, date, descripcion }) {
	const stmt = db.prepare('INSERT INTO payments (order_id, amount, date, descripcion) VALUES (?, ?, ?)');
	const result = stmt.run(orderId, amount, date, descripcion);

	return { id: result.lastInsertRowid, orderId, amount, date, descripcion };
}

function updatePayment(id, { amount, descripcion }) {
	const stmt = db.prepare('UPDATE payments SET amount = ?, descripcion = ? WHERE id = ?');
	const result = stmt.run(amount, descripcion, id);

	if (result.changes > 0) {
		return { success: true, message: 'Pago actualizado exitosamente' }, getPaymentById(id);
	} else {
		return { success: false, message: 'Pago no encontrado' };
	}
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
	getPaymentsByOrderId,
	getPaymentById,
	createPayment,
	updatePayment,
	deletePayment
};