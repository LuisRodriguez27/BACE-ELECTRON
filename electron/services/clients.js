const db = require('../db');

function getAllClients() {
	const stmt = db.prepare('SELECT * FROM clients WHERE active = 1');
	return stmt.all();
}

function getClientById(id) {
	const stmt = db.prepare('SELECT * FROM clients WHERE id = ? AND active = 1');
	return stmt.get(id);
}

function createClient({ name, phone, address, description, color }) {
	const stmt = db.prepare('INSERT INTO clients (name, phone, address, description, color) VALUES (?, ?, ?, ?, ?)');
	const result = stmt.run(name, phone, address, description, color);

	return { id: result.lastInsertRowid, name, phone, address, description, color };
}

function updateClient(id, { name, phone, address, description, color }) {
	const stmt = db.prepare('UPDATE clients SET name = ?, phone = ?, address = ?, description = ?, color = ? WHERE id = ?');
	const result = stmt.run(name, phone, address, description, color, id);
	
	if (result.changes > 0) {
		return { success: true, message: 'Cliente actualizado exitosamente', data: getClientById(id) };
	} else {
		return { success: false, message: 'Cliente no encontrado' };
	}
}

function deleteClient(id) {
	const stmt = db.prepare('UPDATE clients SET active = 0 WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Cliente eliminado exitosamente' };
	} else {
		return { success: false, message: 'Cliente no encontrado' };
	}
}

module.exports = {
	getAllClients,
	getClientById,
	createClient,
	updateClient,
	deleteClient
};