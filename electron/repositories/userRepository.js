const db = require('../db');
const bcrypt = require('bcryptjs');
const User = require('../domain/user');

const saltRounds = 10;

class UserRepository {
  
  async findAll() {
    const stmt = db.prepare('SELECT id, username, active FROM users WHERE active = true');
    const users = await stmt.all();
    
    return await Promise.all(users.map(async user => {
      const permissionsStmt = db.prepare(`
        SELECT p.id as permission_id, p.name as permission_name, up.active
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ? AND p.active = true
      `);
      const userPermissions = await permissionsStmt.all(user.id);
      
      return new User({
        ...user,
        userPermissions: userPermissions
      });
    }));
  }

  async findById(id) {
    const stmt = db.prepare('SELECT id, username, active FROM users WHERE id = ? AND active = true');
    const user = await stmt.get(id);
    
    if (!user) return null;
    
    const permissionsStmt = db.prepare(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ? AND p.active = true
    `);
    const userPermissions = await permissionsStmt.all(id);
    
    return new User({
      ...user,
      userPermissions: userPermissions
    });
  }

  async findByUsername(username) {
    const stmt = db.prepare('SELECT id, username, password, active FROM users WHERE username = ? AND active = true');
    const user = await stmt.get(username);
    
    if (!user) return null;
    
    const permissionsStmt = db.prepare(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = ? AND p.active = true
    `);
    const userPermissions = await permissionsStmt.all(user.id);
    
    return {
      ...user, // Incluye password para verificación
      userPermissions: userPermissions
    };
  }

  async create(userData) {
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = await stmt.run(userData.username, userData.hashedPassword);

    return new User({
      id: result.lastInsertRowid,
      username: userData.username,
      active: true,
      userPermissions: []
    });
  }

  async update(id, userData) {
    let fields = ['username = ?'];
    let values = [userData.username];

    if (userData.hashedPassword) {
      fields.push('password = ?');
      values.push(userData.hashedPassword);
    }

    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    const result = await stmt.run(...values);

    return result.changes > 0;
  }

  async delete(id) {
    const stmt = db.prepare('UPDATE users SET active = false WHERE id = ?');
    const result = await stmt.run(id);
    
    return result.changes > 0;
  }

  async existsByUsername(username, excludeUserId = null) {
    let query = 'SELECT id FROM users WHERE username = ?';
    let params = [username];
    
    if (excludeUserId) {
      query += ' AND id != ?';
      params.push(excludeUserId);
    }
    
    const stmt = db.prepare(query);
    const result = await stmt.get(...params);
    
    return !!result;
  }

  // Método auxiliar para verificación de password
  async getPasswordHash(username) {
    const stmt = db.prepare('SELECT password FROM users WHERE username = ? AND active = true');
    const result = await stmt.get(username);
    return result ? result.password : null;
  }

  // Método para hashear passwords
  static async hashPassword(password) {
    return bcrypt.hashSync(password, saltRounds);
  }

  // Método para verificar passwords
  static async verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }
}

module.exports = new UserRepository();
