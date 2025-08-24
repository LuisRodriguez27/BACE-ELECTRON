const db = require('../db');

function getAllPermissions() {
	const stmt = db.prepare('SELECT * FROM permissions WHERE active = 1');
	return stmt.all();
}

function getPermissionsById(id) {
	const stmt = db.prepare('SELECT * FROM permissions WHERE id = ? AND active = 1');
	return stmt.get(id);
}

function getPermissionsByUserId(userId) {
	const stmt = db.prepare('SELECT p.* FROM permissions p JOIN user_permissions up ON p.id = up.permission_id WHERE up.user_id = ?');
	return stmt.all(userId);
}

function createPermission({ name, description }) {
	const stmt = db.prepare('INSERT INTO permissions (name, description) VALUES (?, ?)');
	const result = stmt.run(name, description);

	return { id: result.lastInsertRowid, name, description, active: 1 };
}

function updatePermission(id, { name, description, active }) {
	const stmt = db.prepare('UPDATE permissions SET name = ?, description = ?, active = ? WHERE id = ?');
	const result = stmt.run(name, description, active, id);
	
	if (result.changes > 0) {
		return { success: true, message: 'Permiso actualizado exitosamente' }, getPermissionsById(id);
	} else {
		return { success: false, message: 'Permiso no encontrado' };
	}
}

function deletePermission(id) {
	const stmt = db.prepare('UPDATE permissions SET active = 0 WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Permiso eliminado exitosamente' };
	} else {
		return { success: false, message: 'Permiso no encontrado' };
	}
}

function assignPermissionToUser({ userId, permissionId }) {
	const stmt = db.prepare('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)');
	const result = stmt.run(userId, permissionId);

	if (result.changes > 0) {
		return { success: true, message: 'Permiso asignado exitosamente' };
	} else {
		return { success: false, message: 'Error al asignar permiso' };
	}
}

function removePermissionFromUser({ userId, permissionId }) {
	const stmt = db.prepare('DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?');
	const result = stmt.run(userId, permissionId);

	if (result.changes > 0) {
		return { success: true, message: 'Permiso eliminado exitosamente' };
	} else {
		return { success: false, message: 'Error al eliminar permiso' };
	}
}

module.exports = {
	getAllPermissions,
	getPermissionsById,
	getPermissionsByUserId,
	createPermission,
	updatePermission,
	deletePermission,
	assignPermissionToUser,
	removePermissionFromUser
};