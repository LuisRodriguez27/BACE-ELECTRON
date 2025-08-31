const db = require('../db');
const bcrypt = require('bcryptjs');

const saltRounds = 10; 

function getAllUsers() {
	const stmt = db.prepare('SELECT id, username, active FROM users WHERE active = 1');
	const users = stmt.all();
	
	// Obtener permisos para cada usuario
	return users.map(user => {
		const permissionsStmt = db.prepare(`
			SELECT p.id as permission_id, p.name as permission_name, up.active
			FROM user_permissions up
			JOIN permissions p ON up.permission_id = p.id
			WHERE up.user_id = ? AND p.active = 1
		`);
		const userPermissions = permissionsStmt.all(user.id);
		
		return {
			...user,
			permissions: userPermissions.map(p => p.permission_name),
			userPermissions: userPermissions
		};
	});
}

function getUserById(id) {
	const stmt = db.prepare('SELECT id, username, active FROM users WHERE id = ? AND active = 1');
	const user = stmt.get(id);
	
	if (!user) return null;
	
	// Obtener permisos del usuario
	const permissionsStmt = db.prepare(`
		SELECT p.id as permission_id, p.name as permission_name, up.active
		FROM user_permissions up
		JOIN permissions p ON up.permission_id = p.id
		WHERE up.user_id = ? AND p.active = 1
	`);
	const userPermissions = permissionsStmt.all(id);
	
	return {
		...user,
		permissions: userPermissions.map(p => p.permission_name),
		userPermissions: userPermissions
	};
}

function createUser({ username, password }) {
	const hashedPassword = bcrypt.hashSync(password, saltRounds);
	
	const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
	const result = stmt.run(username, hashedPassword);

	return { 
		id: result.lastInsertRowid, 
		username, 
		active: 1,
		permissions: [],
		userPermissions: []
	};
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

function checkUsernameExists(username, excludeUserId = null) {
	let query = 'SELECT id FROM users WHERE username = ?';
	let params = [username];
	
	if (excludeUserId) {
		query += ' AND id != ?';
		params.push(excludeUserId);
	}
	
	const stmt = db.prepare(query);
	const result = stmt.get(...params);
	
	return !!result; // Retorna true si existe, false si no
}

module.exports = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	verifyPassword,
	checkUsernameExists
};