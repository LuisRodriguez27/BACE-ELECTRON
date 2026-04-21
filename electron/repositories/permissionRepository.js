const db = require('../db');
const Permission = require('../domain/permission');

class PermissionRepository {

  async findAll() {
    const stmt = db.prepare(`
      SELECT *
      FROM permissions
      WHERE active = true
      ORDER BY name ASC
    `);
    
    const permissions = await stmt.all();
    return permissions.map(permission => {
      // No cargar usuarios por defecto para mejorar performance
      return new Permission({ ...permission, users: [] });
    });
  }

  async findById(id) {
    const permissionData = await db.prepare(`
      SELECT id, name, description, active
      FROM permissions
      WHERE id = ? AND active = true
    `).get(id);

    if (!permissionData) return null;

    // Solo cargar usuarios si específicamente se necesita
    const users = this.getUsersByPermissionId ? await this.getUsersByPermissionId(id) : [];
    return new Permission({ ...permissionData, users });
  }

  async findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT p.id, p.name, p.description, p.active
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = ? AND p.active = true AND up.active = true
      ORDER BY p.name ASC
    `);

    const permissions = await stmt.all(userId);
    return permissions.map(permission => {
      // No necesitamos la lista de usuarios para los permisos del usuario
      return new Permission({ ...permission, users: [] });
    });
  }

  // Método que faltaba
  async getUsersByPermissionId(permissionId) {
    try {
      const stmt = db.prepare(`
        SELECT u.id, u.username
        FROM users u
        JOIN user_permissions up ON u.id = up.user_id
        WHERE up.permission_id = ? AND up.active = true AND u.active = true
        ORDER BY u.username ASC
      `);
      
      return (await stmt.all(permissionId)) || [];
    } catch (error) {
      console.error('Error getting users by permission id:', error);
      return [];
    }
  }

  // Método para verificar si un usuario tiene un permiso específico
  async userHasPermission(userId, permissionId) {
    try {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM user_permissions 
        WHERE user_id = ? AND permission_id = ? AND active = true
      `);
      
      const result = await stmt.get(userId, permissionId);
      return result.count > 0;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  async create(permissionData) {
    const stmt = db.prepare(`
      INSERT INTO permissions (name, description)
      VALUES (?, ?)
    `);
    
    const result = await stmt.run(
      permissionData.name,
      permissionData.description || null
    );

    const permissionId = result.lastInsertRowid;
    return await this.findById(permissionId);
  }

  async update(id, permissionData) {
    const stmt = db.prepare(`
      UPDATE permissions
      SET name = ?, description = ?, active = ?
      WHERE id = ? AND active = true
    `);
    
    const result = await stmt.run(
      permissionData.name || null,
      permissionData.description || null,
      permissionData.active !== undefined ? permissionData.active : 1,
      id
    );

    return result.changes > 0;
  }

  async delete(id) {
    const stmt = db.prepare('UPDATE permissions SET active = false WHERE id = ?');
    const result = await stmt.run(id);
    
    return result.changes > 0;
  }

  // Métodos para manejo de asignaciones usuario-permiso
  async assignToUser(userId, permissionId) {
    try {
      // Verificar si ya existe la asignación
      const existingAssignment = await db.prepare(`
        SELECT * FROM user_permissions 
        WHERE user_id = ? AND permission_id = ?
      `).get(userId, permissionId);

      if (existingAssignment) {
        // Si existe pero está inactiva, reactivarla
        if (existingAssignment.active === false) {
          const updateStmt = db.prepare(`
            UPDATE user_permissions 
            SET active = true 
            WHERE user_id = ? AND permission_id = ?
          `);
          const result = await updateStmt.run(userId, permissionId);
          return result.changes > 0;
        } else {
          // Ya existe y está activa
          return false;
        }
      } else {
        // Crear nueva asignación
        const stmt = db.prepare(`
          INSERT INTO user_permissions (user_id, permission_id) 
          VALUES (?, ?)
        `);
        const result = await stmt.run(userId, permissionId);
        return result.changes > 0;
      }
    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      return false;
    }
  }

  async removeFromUser(userId, permissionId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM user_permissions 
        WHERE user_id = ? AND permission_id = ?
      `);
      const result = await stmt.run(userId, permissionId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      return false;
    }
  }
}

module.exports = new PermissionRepository();
