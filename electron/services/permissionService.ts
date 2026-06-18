import permissionRepository from '../repositories/permissionRepository';
import userRepository from '../repositories/userRepository';
import Permission from '../domain/permission';
import db from '../db';
import type { AssignPermissionData, CreatePermissionData, UpdatePermissionData } from '../types/permission';

class PermissionService {
  async getAllPermissions() {
    try {
      const permissions = await permissionRepository.findAll();
      return permissions.map((p) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      throw new Error('Error al obtener permisos');
    }
  }

  async getPermissionById(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permission = await permissionRepository.findById(id);
      if (!permission) throw new Error('Permiso no encontrado');
      return permission.toPlainObject();
    } catch (error) {
      console.error('Error al obtener permiso:', error);
      throw error;
    }
  }

  async getPermissionsByUserId(userId: number) {
    try {
      if (!userId || isNaN(Number(userId))) throw new Error('ID de usuario inválido');
      const user = await userRepository.findById(userId);
      if (!user) throw new Error('El usuario especificado no existe');
      const permissions = await permissionRepository.findByUserId(userId);
      return permissions.map((p) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      throw error;
    }
  }

  async createPermission(data: CreatePermissionData) {
    try {
      const { name, description } = data;
      if (!name || typeof name !== 'string') throw new Error('El nombre del permiso es requerido');
      const trimmedName = name.trim();
      if (!Permission.isValidPermissionName(trimmedName)) throw new Error('Nombre de permiso inválido. Debe contener solo letras, números y guiones bajos (2-50 caracteres)');
      const permission = await permissionRepository.create({ name: trimmedName, description: description?.trim() || null });
      if (!permission) throw new Error('Error al crear permiso');
      return permission.toPlainObject();
    } catch (error) {
      console.error('Error al crear permiso:', error);
      throw error;
    }
  }

  async updatePermission(id: number, data: UpdatePermissionData) {
    try {
      const { name, description, active } = data;
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permissionId = id;
      const existingPermission = await permissionRepository.findById(permissionId);
      if (!existingPermission) throw new Error('Permiso no encontrado');
      if (!existingPermission.canEdit() && active !== false) throw new Error('No se puede editar este permiso');
      if (name !== undefined && !Permission.isValidPermissionName(name.trim())) throw new Error('Nombre de permiso inválido. Debe contener solo letras, números y guiones bajos (2-50 caracteres)');
      if (active !== undefined && active !== false && active !== true) throw new Error('El estado activo debe ser 0 o 1');
      if (active === false && existingPermission.isCriticalPermission()) throw new Error('No se puede desactivar un permiso crítico del sistema');

      const updated = await permissionRepository.update(permissionId, { name: name?.trim() || existingPermission.name, description: description?.trim() || existingPermission.description, active: active !== undefined ? active : existingPermission.active });
      if (!updated) throw new Error('Error al actualizar permiso');

      const updatedPermission = await permissionRepository.findById(permissionId);
      if (!updatedPermission) throw new Error('Error: no se pudo recuperar el permiso actualizado');
      return updatedPermission.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar permiso:', error);
      throw error;
    }
  }

  async deletePermission(id: number) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permissionId = id;
      const existingPermission = await permissionRepository.findById(permissionId);
      if (!existingPermission) throw new Error('Permiso no encontrado');
      if (!existingPermission.canDelete()) throw new Error('No se puede eliminar este permiso. Puede ser un permiso crítico o tener usuarios asignados');
      if (existingPermission.isCriticalPermission()) throw new Error('No se puede eliminar un permiso crítico del sistema');
      if (existingPermission.hasUsers()) throw new Error('No se puede eliminar un permiso que tiene usuarios asignados. Primero retire todas las asignaciones');
      const deleted = await permissionRepository.delete(permissionId);
      if (!deleted) throw new Error('Error al eliminar permiso');
    } catch (error) {
      console.error('Error al eliminar permiso:', error);
      throw error;
    }
  }

  async assignPermissionToUser(data: AssignPermissionData) {
    try {
      const { userId, permissionId } = data;
      if (!userId || userId <= 0) throw new Error('ID de usuario inválido');
      if (!permissionId || permissionId <= 0) throw new Error('ID de permiso inválido');

      const transaction = db.transaction(async () => {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('El usuario especificado no existe');
        const permission = await permissionRepository.findById(permissionId);
        if (!permission) throw new Error('El permiso especificado no existe');
        if (!user.isActive()) throw new Error('No se puede asignar permisos a un usuario inactivo');
        if (!permission.isActive()) throw new Error('No se puede asignar un permiso inactivo');
        if (await permissionRepository.userHasPermission(userId, permissionId)) throw new Error('El usuario ya tiene asignado este permiso');

        const assigned = await permissionRepository.assignToUser(userId, permissionId);
        if (!assigned) throw new Error('Error al asignar permiso al usuario');

        const updatedUser = await userRepository.findById(userId);
        if (!updatedUser) throw new Error('Error al obtener usuario actualizado');
        return updatedUser.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      throw error;
    }
  }

  async removePermissionFromUser(data: AssignPermissionData) {
    try {
      const { userId, permissionId } = data;
      if (!userId || userId <= 0) throw new Error('ID de usuario inválido');
      if (!permissionId || permissionId <= 0) throw new Error('ID de permiso inválido');

      const transaction = db.transaction(async () => {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('El usuario especificado no existe');
        const permission = await permissionRepository.findById(permissionId);
        if (!permission) throw new Error('El permiso especificado no existe');
        if (!(await permissionRepository.userHasPermission(userId, permissionId))) throw new Error('El usuario no tiene asignado este permiso');

        if (permission.isCriticalPermission()) {
          const usersWithPermission = permission.getAssignedUsers();
          if (usersWithPermission.length <= 1) throw new Error('No se puede remover el último usuario con un permiso crítico');
        }

        const removed = await permissionRepository.removeFromUser(userId, permissionId);
        if (!removed) throw new Error('Error al remover permiso del usuario');

        const updatedUser = await userRepository.findById(userId);
        if (!updatedUser) throw new Error('Error al obtener usuario actualizado');
        return updatedUser.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      throw error;
    }
  }
}

export default new PermissionService();
