const db = require('../db');
const bcrypt = require('bcryptjs');

const saltRounds = 10; 

function getAllUsers() {
	const stmt = db.prepare('SELECT id, username, active FROM users WHERE active = 1');
	return stmt.all();
}

function getUserById(id) {
	const stmt = db.prepare('SELECT id, username FROM users WHERE id = ? AND active = 1');
	return stmt.get(id);
}

function createUser({ username, password }) {
	const hashedPassword = bcrypt.hashSync(password, saltRounds);
	
	const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
	const result = stmt.run(username, hashedPassword);

	return { id: result.lastInsertRowid, username, active: 1 };
}

function updateUser(id, { username, password }) {
  let fields = ['username = ?'];
  let values = [username];

  if (password) {
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    fields.push('password = ?');
    values.push(hashedPassword);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes > 0) {
    return { 
      success: true, 
      message: 'Usuario actualizado exitosamente',
      user: getUserById(id) 
    };
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
  
  return bcrypt.compareSync(password, stmt.password);
}

module.exports = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	verifyPassword
};