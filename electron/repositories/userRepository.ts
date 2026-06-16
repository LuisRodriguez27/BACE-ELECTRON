import db from '../db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const User = require('../domain/user');

class UserRepository {
  async findAll() {
    const users = await db.getAll('SELECT id, username, active FROM users WHERE active = true');
    return await Promise.all(users.map(async (user) => {
      const userPermissions = await db.getAll(`
        SELECT p.id as permission_id, p.name as permission_name, up.active
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND p.active = true
      `, [user.id]);
      return new User({ ...user, userPermissions });
    }));
  }

  async findById(id: number) {
    const user = await db.getOne('SELECT id, username, active FROM users WHERE id = $1 AND active = true', [id]);
    if (!user) return null;
    const userPermissions = await db.getAll(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.active = true
    `, [id]);
    return new User({ ...user, userPermissions });
  }

  async findByUsername(username: string) {
    const user = await db.getOne('SELECT id, username, password, active FROM users WHERE username = $1 AND active = true', [username]);
    if (!user) return null;
    const userPermissions = await db.getAll(`
      SELECT p.id as permission_id, p.name as permission_name, up.active
      FROM user_permissions up
      JOIN permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1 AND p.active = true
    `, [user.id]);
    return { ...user, userPermissions };
  }

  async create(userData: { username: string; hashedPassword: string }) {
    const result = await db.execute('INSERT INTO users (username, password) VALUES ($1, $2)', [userData.username, userData.hashedPassword]);
    return new User({ id: result.lastInsertRowid, username: userData.username, active: true, userPermissions: [] });
  }

  async update(id: number, userData: { username: string; hashedPassword?: string }): Promise<boolean> {
    const fields = ['username = $1'];
    const values: unknown[] = [userData.username];
    let paramIndex = 2;

    if (userData.hashedPassword) {
      fields.push(`password = $${paramIndex}`);
      values.push(userData.hashedPassword);
      paramIndex++;
    }

    values.push(id);
    const result = await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE users SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async existsByUsername(username: string, excludeUserId: number | null = null): Promise<boolean> {
    let query = 'SELECT id FROM users WHERE username = $1';
    const params: unknown[] = [username];
    if (excludeUserId) { query += ' AND id != $2'; params.push(excludeUserId); }
    const result = await db.getOne(query, params);
    return !!result;
  }

  async getPasswordHash(username: string): Promise<string | null> {
    const result = await db.getOne<{ password: string }>('SELECT password FROM users WHERE username = $1 AND active = true', [username]);
    return result ? result.password : null;
  }

  static hashPassword(password: string): string {
    return require('bcryptjs').hashSync(password, saltRounds);
  }

  static verifyPassword(password: string, hashedPassword: string): boolean {
    return require('bcryptjs').compareSync(password, hashedPassword);
  }
}

const saltRounds = 10;
module.exports = new UserRepository();
