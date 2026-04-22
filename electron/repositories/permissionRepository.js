const db = require('../db');
const Permission = require('../domain/permission');

class PermissionRepository {

  async findAll() {
    const permissions = await db.getAll(`
      SELECT *
      FROM permissions
      WHERE active = true
      ORDER BY name ASC
    `);
    
    return permissions.map(permission => {
      // No cargar usuarios por defecto para mejorar performance
      return new Permission({ ...permission, users: [] });
    });
  }

  async findById(id) {
    const permissionData = await db.getOne(`
      SELECT id, name, description, active
      FROM permissions
      WHERE id = $1 AND active = true
    `, [id]);

    if (!permissionData) return null;

    // Solo cargar usuarios si específicamente se necesita
    const users = this.getUsersByPermissionId ? await this.getUsersByPermissionId(id) : [];
    return new Permission({ ...permissionData, users });
  }

  async findByUserId(userId) {
    const permissions = await db.getAll(`
      SELECT p.id, p.name, p.description, p.active
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = $1 AND p.active = true AND up.active = true
      ORDER BY p.name ASC
    `, [userId]);

    return permissions.map(permission => {
      // No necesitamos la lista de usuarios para los permisos del usuario
      return new Permission({ ...permission, users: [] });
    });
  }

  // Método que faltaba
  async getUsersByPermissionId(permissionId) {
    try {
      const users = await db.getAll(`
        SELECT u.id, u.username
        FROM users u
        JOIN user_permissions up ON u.id = up.user_id
        WHERE up.permission_id = $1 AND up.active = true AND u.active = true
        ORDER BY u.username ASC
      `, [permissionId]);
      
      return users || [];
    } catch (error) {
      console.error('Error getting users by permission id:', error);
      return [];
    }
  }

  // Método para verificar si un usuario tiene un permiso específico
  async userHasPermission(userId, permissionId) {
    try {
      const result = await db.getOne(`
        SELECT COUNT(*) as count
        FROM user_permissions 
        WHERE user_id = $1 AND permission_id = $2 AND active = true
      `, [userId, permissionId]);
      
      return result.count > 0;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  async create(permissionData) {
    const result = await db.execute(`
      INSERT INTO permissions (name, description)
      VALUES ($1, $2)
    `, [
      permissionData.name,
      permissionData.description || null
    ]);

    const permissionId = result.lastInsertRowid;
    return await this.findById(permissionId);
  }

  async update(id, permissionData) {
    const result = await db.execute(`
      UPDATE permissions
      SET name = $1, description = $2, active = $3
      WHERE id = $4 AND active = true
    `, [
      permissionData.name || null,
      permissionData.description || null,
      permissionData.active !== undefined ? permissionData.active : true,
      id
    ]);

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE permissions SET active = false WHERE id = $1', [id]);
    
    return result.changes > 0;
  }

  // Métodos para manejo de asignaciones usuario-permiso
  async assignToUser(userId, permissionId) {
    try {
      // Verificar si ya existe la asignación
      const existingAssignment = await db.getOne(`
        SELECT * FROM user_permissions 
        WHERE user_id = $1 AND permission_id = $2
      `, [userId, permissionId]);

      if (existingAssignment) {
        // Si existe pero está inactiva, reactivarla
        if (existingAssignment.active === false) {
          const result = await db.execute(`
            UPDATE user_permissions 
            SET active = true 
            WHERE user_id = $1 AND permission_id = $2
          `, [userId, permissionId]);
          return result.changes > 0;
        } else {
          // Ya existe y está activa
          return false;
        }
      } else {
        // Crear nueva asignación
        const result = await db.execute(`
          INSERT INTO user_permissions (user_id, permission_id) 
          VALUES ($1, $2)
        `, [userId, permissionId]);
        return result.changes > 0;
      }
    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      return false;
    }
  }

  async removeFromUser(userId, permissionId) {
    try {
      const result = await db.execute(`
        DELETE FROM user_permissions 
        WHERE user_id = $1 AND permission_id = $2
      `, [userId, permissionId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      return false;
    }
  }
}

module.exports = new PermissionRepository();
