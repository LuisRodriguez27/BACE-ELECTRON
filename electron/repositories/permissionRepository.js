const db = require('../db');
const Permission = require('../domain/permission');

class PermissionRepository {

  findAll() {
    const stmt = db.prepare(`
      SELECT *
      FROM permissions
      WHERE active = 1
      ORDER BY name ASC
    `);
    
    const permissions = stmt.all();
    return permissions.map(permission => {
      // No cargar usuarios por defecto para mejorar performance
      return new Permission({ ...permission, users: [] });
    });
  }

  findById(id) {
    const permissionData = db.prepare(`
      SELECT id, name, description, active
      FROM permissions
      WHERE id = ? AND active = 1
    `).get(id);

    if (!permissionData) return null;

    // Solo cargar usuarios si específicamente se necesita
    const users = this.getUsersByPermissionId ? this.getUsersByPermissionId(id) : [];
    return new Permission({ ...permissionData, users });
  }

  findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT p.id, p.name, p.description, p.active
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = ? AND p.active = 1 AND up.active = 1
      ORDER BY p.name ASC
    `);

    const permissions = stmt.all(userId);
    return permissions.map(permission => {
      // No necesitamos la lista de usuarios para los permisos del usuario
      return new Permission({ ...permission, users: [] });
    });
  }

  // Método que faltaba
  getUsersByPermissionId(permissionId) {
    try {
      const stmt = db.prepare(`
        SELECT u.id, u.username
        FROM users u
        JOIN user_permissions up ON u.id = up.user_id
        WHERE up.permission_id = ? AND up.active = 1 AND u.active = 1
        ORDER BY u.username ASC
      `);
      
      return stmt.all(permissionId) || [];
    } catch (error) {
      console.error('Error getting users by permission id:', error);
      return [];
    }
  }

  // Método para verificar si un usuario tiene un permiso específico
  userHasPermission(userId, permissionId) {
    try {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM user_permissions 
        WHERE user_id = ? AND permission_id = ? AND active = 1
      `);
      
      const result = stmt.get(userId, permissionId);
      return result.count > 0;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  create(permissionData) {
    const stmt = db.prepare(`
      INSERT INTO permissions (name, description)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(
      permissionData.name,
      permissionData.description || null
    );

    const permissionId = result.lastInsertRowid;
    return this.findById(permissionId);
  }

  update(id, permissionData) {
    const stmt = db.prepare(`
      UPDATE permissions
      SET name = ?, description = ?, active = ?
      WHERE id = ? AND active = 1
    `);
    
    const result = stmt.run(
      permissionData.name || null,
      permissionData.description || null,
      permissionData.active !== undefined ? permissionData.active : 1,
      id
    );

    return result.changes > 0;
  }

  delete(id) {
    const stmt = db.prepare('UPDATE permissions SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  // Métodos para manejo de asignaciones usuario-permiso
  assignToUser(userId, permissionId) {
    try {
      // Verificar si ya existe la asignación
      const existingAssignment = db.prepare(`
        SELECT * FROM user_permissions 
        WHERE user_id = ? AND permission_id = ?
      `).get(userId, permissionId);

      if (existingAssignment) {
        // Si existe pero está inactiva, reactivarla
        if (existingAssignment.active === 0) {
          const updateStmt = db.prepare(`
            UPDATE user_permissions 
            SET active = 1 
            WHERE user_id = ? AND permission_id = ?
          `);
          const result = updateStmt.run(userId, permissionId);
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
        const result = stmt.run(userId, permissionId);
        return result.changes > 0;
      }
    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      return false;
    }
  }

  removeFromUser(userId, permissionId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM user_permissions 
        WHERE user_id = ? AND permission_id = ?
      `);
      const result = stmt.run(userId, permissionId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      return false;
    }
  }
}

module.exports = new PermissionRepository();
