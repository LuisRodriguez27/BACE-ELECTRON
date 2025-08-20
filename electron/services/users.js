const db = require('../db');
const bcrypt = require('bcryptjs');

const saltRounds = 10; 

function getAllUsers() {
	const stmt = db.prepare('SELECT id, username FROM users');
	return stmt.all();
}

function getUserById(id) {
	const stmt = db.prepare('SELECT id, username FROM users WHERE id = ?');
	return stmt.get(id);
}

function createUser({ username, password }) {
	const hashedPassword = bcrypt.hashSync(password, saltRounds);
	
	const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
	const result = stmt.run(username, hashedPassword);

	return { id: result.lastInsertRowid, username };
}

function updateUser({ id, username, password, active }) {
	const hashedPassword = bcrypt.hashSync(password, saltRounds);
	
	const stmt = db.prepare('UPDATE users SET username = ?, password = ?, active = ? WHERE id = ?');
	const result = stmt.run(username, hashedPassword, active, id);
	
	if (result.changes > 0) {
		return { success: true, message: 'Usuario actualizado exitosamente' }, getUserById(id);
	} else {
		return { success: false, message: 'Usuario no encontrado' };
	}
}

function deleteUser(id) {
	const stmt = db.prepare('UPDATE users SET active = 0 WHERE id = ?');
	const result = stmt.run(id);

	if (result.changes > 0) {
		return { success: true, message: 'Usuario eliminado exitosamente' };
  } else {
    return { success: false, message: 'Usuario no encontrado' };
  }
}

function verifyPassword({ username, password }) {
	const stmt = db.prepare('SELECT password FROM users WHERE username = ?').get(username);
	if (!stmt) {
    return false; 
  }
  
  return bcrypt.compareSync(password, user.password);
}

module.exports = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	verifyPassword
};