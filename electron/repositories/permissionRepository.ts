import db from '../db';
import Permission from '../domain/permission';
import type { PermissionRow, PermissionUser } from '../types/permission';

class PermissionRepository {
  async findAll() {
    const permissions = await db.getAll<PermissionRow>(`SELECT * FROM permissions WHERE active = true ORDER BY name ASC`);
    return permissions.map((p) => new Permission({ ...p, users: [] }));
  }

  async findById(id: number) {
    const permissionData = await db.getOne<PermissionRow>(`SELECT id, name, description, active FROM permissions WHERE id = $1 AND active = true`, [id]);
    if (!permissionData) return null;
    const users = await this.getUsersByPermissionId(id);
    return new Permission({ ...permissionData, users });
  }

  async findByUserId(userId: number) {
    const permissions = await db.getAll<PermissionRow>(`
      SELECT p.id, p.name, p.description, p.active
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = $1 AND p.active = true AND up.active = true
      ORDER BY p.name ASC
    `, [userId]);
    return permissions.map((p) => new Permission({ ...p, users: [] }));
  }

  async getUsersByPermissionId(permissionId: number) {
    try {
      return await db.getAll<PermissionUser>(`
        SELECT u.id, u.username FROM users u
        JOIN user_permissions up ON u.id = up.user_id
        WHERE up.permission_id = $1 AND up.active = true AND u.active = true
        ORDER BY u.username ASC
      `, [permissionId]) ?? [];
    } catch (e) {
      console.error('Error getting users by permission id:', e);
      return [];
    }
  }

  async userHasPermission(userId: number, permissionId: number): Promise<boolean> {
    try {
      const result = await db.getOne<{ count: string }>(`SELECT COUNT(*) as count FROM user_permissions WHERE user_id = $1 AND permission_id = $2 AND active = true`, [userId, permissionId]);
      return parseInt(result!.count, 10) > 0;
    } catch (e) {
      console.error('Error checking user permission:', e);
      return false;
    }
  }

  async create(permissionData: { name: string; description?: string | null }) {
    const result = await db.execute(`INSERT INTO permissions (name, description) VALUES ($1, $2)`, [permissionData.name, permissionData.description || null]);
    return await this.findById(result.lastInsertRowid!);
  }

  async update(id: number, permissionData: { name?: string; description?: string | null; active?: boolean }): Promise<boolean> {
    const result = await db.execute(`UPDATE permissions SET name = $1, description = $2, active = $3 WHERE id = $4 AND active = true`, [permissionData.name || null, permissionData.description || null, permissionData.active !== undefined ? permissionData.active : true, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE permissions SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async assignToUser(userId: number, permissionId: number): Promise<boolean> {
    try {
      const existing = await db.getOne<{ active: boolean }>(`SELECT * FROM user_permissions WHERE user_id = $1 AND permission_id = $2`, [userId, permissionId]);
      if (existing) {
        if (existing.active === false) {
          const r = await db.execute(`UPDATE user_permissions SET active = true WHERE user_id = $1 AND permission_id = $2`, [userId, permissionId]);
          return (r.changes ?? 0) > 0;
        }
        return false;
      }
      const r = await db.execute(`INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)`, [userId, permissionId]);
      return (r.changes ?? 0) > 0;
    } catch (e) {
      console.error('Error al asignar permiso a usuario:', e);
      return false;
    }
  }

  async removeFromUser(userId: number, permissionId: number): Promise<boolean> {
    try {
      const r = await db.execute(`DELETE FROM user_permissions WHERE user_id = $1 AND permission_id = $2`, [userId, permissionId]);
      return (r.changes ?? 0) > 0;
    } catch (e) {
      console.error('Error al remover permiso de usuario:', e);
      return false;
    }
  }
}

export default new PermissionRepository();
