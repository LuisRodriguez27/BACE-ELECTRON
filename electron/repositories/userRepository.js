const db = require('../db');
const bcrypt = require('bcryptjs');
const User = require('../domain/user');

const saltRounds = 10;

class UserRepository {
  
  async findAll() {
    const users = await db.getAll('SELECT id, username, active FROM users WHERE active = true');
    
    return await Promise.all(users.map(async user => {
      const userPermissions = await db.getAll(`
        SELECT p.id as permission_id, p.name as permission_name, up.active
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND p.active = true
      `, [user.id]);
      
      return new User({
        ...user,
        userPermissions: userPermissions
      });
    }));
  }

  async findById(id) {
    const user = await db.getOne('SELECT id, username, active FROM users WHERE id = $1 AND active = true', [id]);
    
    if (!user) return null;
    
    const userPermissions = await db.getAll(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.active = true
    `, [id]);
    
    return new User({
      ...user,
      userPermissions: userPermissions
    });
  }

  async findByUsername(username) {
    const user = await db.getOne('SELECT id, username, password, active FROM users WHERE username = $1 AND active = true', [username]);
    
    if (!user) return null;
    
    const userPermissions = await db.getAll(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.active = true
    `, [user.id]);
    
    return {
      ...user, // Incluye password para verificación
      userPermissions: userPermissions
    };
  }

  async create(userData) {
    const result = await db.execute('INSERT INTO users (username, password) VALUES ($1, $2)', [userData.username, userData.hashedPassword]);

    return new User({
      id: result.lastInsertRowid,
      username: userData.username,
      active: true,
      userPermissions: []
    });
  }

  async update(id, userData) {
    let fields = ['username = $1'];
    let values = [userData.username];
    let paramIndex = 2;

    if (userData.hashedPassword) {
      fields.push(`password = $${paramIndex}`);
      values.push(userData.hashedPassword);
      paramIndex++;
    }

    values.push(id);

    const result = await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE users SET active = false WHERE id = $1', [id]);
    
    return result.changes > 0;
  }

  async existsByUsername(username, excludeUserId = null) {
    let query = 'SELECT id FROM users WHERE username = $1';
    let params = [username];
    
    if (excludeUserId) {
      query += ' AND id != $2';
      params.push(excludeUserId);
    }
    
    const result = await db.getOne(query, params);
    
    return !!result;
  }

  // Método auxiliar para verificación de password
  async getPasswordHash(username) {
    const result = await db.getOne('SELECT password FROM users WHERE username = $1 AND active = true', [username]);
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
