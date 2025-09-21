const permissionRepository = require('../repositories/permissionRepository');
const userRepository = require('../repositories/userRepository');
const Permission = require('../domain/permission');

class PermissionService {

  async getAllPermissions() {
    try {
      const permissions = permissionRepository.findAll();
      return permissions.map(permission => permission.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      throw new Error('Error al obtener permisos');
    }
  }

  async getPermissionById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de permiso inválido');
      }

      const permission = permissionRepository.findById(parseInt(id));
      
      if (!permission) {
        throw new Error('Permiso no encontrado');
      }

      return permission.toPlainObject();
    } catch (error) {
      console.error('Error al obtener permiso:', error);
      throw error;
    }
  }

  async getPermissionsByUserId(userId) {
    try {
      if (!userId || isNaN(userId)) {
        throw new Error('ID de usuario inválido');
      }

      // Verificar que el usuario existe
      const user = userRepository.findById(parseInt(userId));
      if (!user) {
        throw new Error('El usuario especificado no existe');
      }

      const permissions = permissionRepository.findByUserId(parseInt(userId));
      return permissions.map(permission => permission.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      throw error;
    }
  }

  async createPermission({ name, description }) {
    try {
      // Validaciones de negocio
      if (!name || typeof name !== 'string') {
        throw new Error('El nombre del permiso es requerido');
      }

      const trimmedName = name.trim();
      
      if (!Permission.isValidPermissionName(trimmedName)) {
        throw new Error('Nombre de permiso inválido. Debe contener solo letras, números y guiones bajos (2-50 caracteres)');
      }

      // Crear permiso
      const permission = permissionRepository.create({
        name: trimmedName,
        description: description?.trim() || null
      });

      if (!permission) {
        throw new Error('Error al crear permiso');
      }

      return permission.toPlainObject();

    } catch (error) {
      console.error('Error al crear permiso:', error);
      throw error;
    }
  }

  async updatePermission(id, { name, description, active }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de permiso inválido');
      }

      const permissionId = parseInt(id);

      // Verificar si el permiso existe
      const existingPermission = permissionRepository.findById(permissionId);
      if (!existingPermission) {
        throw new Error('Permiso no encontrado');
      }

      // Validar que se puede editar
      if (!existingPermission.canEdit() && active !== 0) {
        throw new Error('No se puede editar este permiso');
      }

      // Validar nombre si se proporciona
      if (name !== undefined) {
        const trimmedName = name.trim();
        
        if (!Permission.isValidPermissionName(trimmedName)) {
          throw new Error('Nombre de permiso inválido. Debe contener solo letras, números y guiones bajos (2-50 caracteres)');
        }
      }

      // Validar active si se proporciona
      if (active !== undefined && active !== 0 && active !== 1) {
        throw new Error('El estado activo debe ser 0 o 1');
      }

      // Verificar permisos críticos antes de desactivar
      if (active === 0 && existingPermission.isCriticalPermission()) {
        throw new Error('No se puede desactivar un permiso crítico del sistema');
      }

      // Actualizar permiso
      const updated = permissionRepository.update(permissionId, {
        name: name?.trim() || existingPermission.name,
        description: description?.trim() || existingPermission.description,
        active: active !== undefined ? active : existingPermission.active
      });

      if (!updated) {
        throw new Error('Error al actualizar permiso');
      }

      // Obtener permiso actualizado
      const updatedPermission = permissionRepository.findById(permissionId);
      
      if (!updatedPermission) {
        throw new Error('Error: no se pudo recuperar el permiso actualizado');
      }
      
      return updatedPermission.toPlainObject();
      
    } catch (error) {
      console.error('Error al actualizar permiso:', error);
      throw error;
    }
  }

  async deletePermission(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de permiso inválido');
      }

      const permissionId = parseInt(id);

      // Verificar si el permiso existe
      const existingPermission = permissionRepository.findById(permissionId);
      if (!existingPermission) {
        throw new Error('Permiso no encontrado');
      }

      // Lógica de negocio: verificar si se puede eliminar
      if (!existingPermission.canDelete()) {
        throw new Error('No se puede eliminar este permiso. Puede ser un permiso crítico o tener usuarios asignados');
      }

      if (existingPermission.isCriticalPermission()) {
        throw new Error('No se puede eliminar un permiso crítico del sistema');
      }

      // Verificar si tiene usuarios asignados
      if (existingPermission.hasUsers()) {
        throw new Error('No se puede eliminar un permiso que tiene usuarios asignados. Primero retire todas las asignaciones');
      }

      const deleted = permissionRepository.delete(permissionId);

      if (!deleted) {
        throw new Error('Error al eliminar permiso');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar permiso:', error);
      throw error;
    }
  }

  async assignPermissionToUser({ userId, permissionId }) {
    try {
      // Validaciones de entrada
      if (!userId || isNaN(userId)) {
        throw new Error('ID de usuario inválido');
      }

      if (!permissionId || isNaN(permissionId)) {
        throw new Error('ID de permiso inválido');
      }

      const userIdInt = parseInt(userId);
      const permissionIdInt = parseInt(permissionId);

      // Verificar que el usuario exists
      const user = userRepository.findById(userIdInt);
      if (!user) {
        throw new Error('El usuario especificado no existe');
      }

      // Verificar que el permiso exists
      const permission = permissionRepository.findById(permissionIdInt);
      if (!permission) {
        throw new Error('El permiso especificado no existe');
      }

      // Verificar que el usuario esté activo
      if (!user.isActive()) {
        throw new Error('No se puede asignar permisos a un usuario inactivo');
      }

      // Verificar que el permiso esté activo
      if (!permission.isActive()) {
        throw new Error('No se puede asignar un permiso inactivo');
      }

      // Verificar si ya tiene el permiso
      if (permissionRepository.userHasPermission(userIdInt, permissionIdInt)) {
        throw new Error('El usuario ya tiene asignado este permiso');
      }

      // Asignar permiso
      const assigned = permissionRepository.assignToUser(userIdInt, permissionIdInt);

      if (!assigned) {
        throw new Error('Error al asignar permiso al usuario');
      }

      // Retornar el usuario actualizado
      const updatedUser = userRepository.findById(userIdInt);
      return updatedUser.toPlainObject();

    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      throw error;
    }
  }

  async removePermissionFromUser({ userId, permissionId }) {
    try {
      // Validaciones de entrada
      if (!userId || isNaN(userId)) {
        throw new Error('ID de usuario inválido');
      }

      if (!permissionId || isNaN(permissionId)) {
        throw new Error('ID de permiso inválido');
      }

      const userIdInt = parseInt(userId);
      const permissionIdInt = parseInt(permissionId);

      // Verificar que el usuario exists
      const user = userRepository.findById(userIdInt);
      if (!user) {
        throw new Error('El usuario especificado no existe');
      }

      // Verificar que el permiso exists
      const permission = permissionRepository.findById(permissionIdInt);
      if (!permission) {
        throw new Error('El permiso especificado no existe');
      }

      // Verificar si el usuario tiene el permiso
      if (!permissionRepository.userHasPermission(userIdInt, permissionIdInt)) {
        throw new Error('El usuario no tiene asignado este permiso');
      }

      // Verificar permisos críticos
      if (permission.isCriticalPermission()) {
        // Solo permitir si no es el último usuario con este permiso crítico
        const usersWithPermission = permission.getAssignedUsers();
        if (usersWithPermission.length <= 1) {
          throw new Error('No se puede remover el último usuario con un permiso crítico');
        }
      }

      // Remover permiso
      const removed = permissionRepository.removeFromUser(userIdInt, permissionIdInt);

      if (!removed) {
        throw new Error('Error al remover permiso del usuario');
      }

      // Retornar el usuario actualizado
      const updatedUser = userRepository.findById(userIdInt);
      return updatedUser.toPlainObject();

    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      throw error;
    }
  }
}

module.exports = new PermissionService();
