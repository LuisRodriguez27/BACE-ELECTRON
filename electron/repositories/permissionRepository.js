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
      const users = this.getUsersByPermissionId(permission.id);
      return new Permission({ ...permission, users });
    });
  }

  findById(id) {
    const permissionData = db.prepare(`
      SELECT id, name, description, active
      FROM permissions
      WHERE id = ? AND active = 1
    `).get(id);

    if (!permissionData) return null;

    const users = this.getUsersByPermissionId(id);
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
      const users = this.getUsersByPermissionId(permission.id);
      return new Permission({ ...permission, users });
    });
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
