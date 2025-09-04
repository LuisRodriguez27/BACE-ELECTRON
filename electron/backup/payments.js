// DEPRECATED: Este archivo ha sido reemplazado por el patrón Repository + Service Layer
// Nuevo patrón:
// - Domain: ../domain/payments.js (entidad)
// - Repository: ../repositories/paymentsRepository.js (acceso a datos)
// - Service: ../services/paymentsService.js (lógica de negocio)
// Este archivo se mantiene por compatibilidad, pero no se usa más.

const db = require('../db.js');

function getPaymentsByOrderId(orderId) {
	const stmt = db.prepare(`
		SELECT p.*, 
		      o.id as order_id, o.client_id, o.status, o.total as order_total
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    WHERE p.order_id = ?
    ORDER BY p.date DESC
	`);
	const payments = stmt.all(orderId);
	
	// Estructurar respuesta según types del frontend
	return payments.map(payment => ({
		id: payment.id,
		order_id: payment.order_id,
		amount: payment.amount,
		date: payment.date,
		descripcion: payment.descripcion,
		order: payment.order_id ? {
			id: payment.order_id,
			client_id: payment.client_id,
			status: payment.status,
			total: payment.order_total
		} : undefined
	}));
}

function getPaymentById(id) {
	const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
	return stmt.get(id);
}

function createPayment({ orderId, amount, date, descripcion }) {
	// El frontend envía 'orderId' pero la BD usa 'order_id'
	const order_id = orderId;
	const stmt = db.prepare('INSERT INTO payments (order_id, amount, date, descripcion) VALUES (?, ?, ?, ?)');
	const result = stmt.run(order_id, amount, date, descripcion);

	return { id: result.lastInsertRowid, order_id, amount, date, descripcion };
}

function updatePayment(id, { amount, descripcion }) {
	const stmt = db.prepare('UPDATE payments SET amount = ?, descripcion = ? WHERE id = ?');
	const result = stmt.run(amount, descripcion, id);

	if (result.changes > 0) {
		return { success: true, message: 'Pago actualizado exitosamente', data: getPaymentById(id) };
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