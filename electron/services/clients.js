const db = require('../db');

function getAllClients() {
	const stmt = db.prepare('SELECT * FROM clients');
	return stmt.all();
}

function getClientById(id) {
	const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
	return stmt.get(id);
}

function createClient(clientData) {
	const { name, phone, address, description } = clientData;
	
	// Validación básica
	if (!name) {
		throw new Error('Name is required');
	}
	
	const stmt = db.prepare('INSERT INTO clients (name, phone, address, description) VALUES (?, ?, ?, ?)');
	const info = stmt.run(name, phone, address, description);
	return { id: info.lastInsertRowid, name };
}

function updateClient(id, name, phone, address, description) {
	const stmt = db.prepare('UPDATE clients SET name = ?, phone = ?, address = ?, description = ? WHERE id = ?');
	const info = stmt.run(name, phone, address, description, id);
	
	if (info.changes > 0) {
		return { success: true, message: 'Cliente actualizado exitosamente' }, getClientById(id);
	} else {
		return { success: false, message: 'Cliente no encontrado' };
	}
}

function deleteClient(id) {
	const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
	const info = stmt.run(id);

	if (info.changes > 0) {
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