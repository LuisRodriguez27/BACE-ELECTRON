// eslint-disable-next-line @typescript-eslint/no-require-imports
const permissionRepository = require('../repositories/permissionRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRepository = require('../repositories/userRepository');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Permission = require('../domain/permission');

class PermissionService {
  async getAllPermissions() {
    try {
      const permissions = await permissionRepository.findAll();
      return permissions.map((p: { toPlainObject: () => unknown }) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      throw new Error('Error al obtener permisos');
    }
  }

  async getPermissionById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permission = await permissionRepository.findById(parseInt(String(id)));
      if (!permission) throw new Error('Permiso no encontrado');
      return permission.toPlainObject();
    } catch (error) {
      console.error('Error al obtener permiso:', error);
      throw error;
    }
  }

  async getPermissionsByUserId(userId: number | string) {
    try {
      if (!userId || isNaN(Number(userId))) throw new Error('ID de usuario inválido');
      const user = await userRepository.findById(parseInt(String(userId)));
      if (!user) throw new Error('El usuario especificado no existe');
      const permissions = await permissionRepository.findByUserId(parseInt(String(userId)));
      return permissions.map((p: { toPlainObject: () => unknown }) => p.toPlainObject());
    } catch (error) {
      console.error('Error al obtener permisos del usuario:', error);
      throw error;
    }
  }

  async createPermission({ name, description }: { name: string; description?: string | null }) {
    try {
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

  async updatePermission(id: number | string, { name, description, active }: { name?: string; description?: string | null; active?: boolean }) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permissionId = parseInt(String(id));
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

  async deletePermission(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de permiso inválido');
      const permissionId = parseInt(String(id));
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

  async assignPermissionToUser({ userId, permissionId }: { userId: number | string; permissionId: number | string }) {
    try {
      if (!userId || isNaN(Number(userId))) throw new Error('ID de usuario inválido');
      if (!permissionId || isNaN(Number(permissionId))) throw new Error('ID de permiso inválido');

      const userIdInt = parseInt(String(userId));
      const permissionIdInt = parseInt(String(permissionId));

      const user = await userRepository.findById(userIdInt);
      if (!user) throw new Error('El usuario especificado no existe');
      const permission = await permissionRepository.findById(permissionIdInt);
      if (!permission) throw new Error('El permiso especificado no existe');
      if (!user.isActive()) throw new Error('No se puede asignar permisos a un usuario inactivo');
      if (!permission.isActive()) throw new Error('No se puede asignar un permiso inactivo');
      if (await permissionRepository.userHasPermission(userIdInt, permissionIdInt)) throw new Error('El usuario ya tiene asignado este permiso');

      const assigned = await permissionRepository.assignToUser(userIdInt, permissionIdInt);
      if (!assigned) throw new Error('Error al asignar permiso al usuario');

      const updatedUser = await userRepository.findById(userIdInt);
      return updatedUser.toPlainObject();
    } catch (error) {
      console.error('Error al asignar permiso a usuario:', error);
      throw error;
    }
  }

  async removePermissionFromUser({ userId, permissionId }: { userId: number | string; permissionId: number | string }) {
    try {
      if (!userId || isNaN(Number(userId))) throw new Error('ID de usuario inválido');
      if (!permissionId || isNaN(Number(permissionId))) throw new Error('ID de permiso inválido');

      const userIdInt = parseInt(String(userId));
      const permissionIdInt = parseInt(String(permissionId));

      const user = await userRepository.findById(userIdInt);
      if (!user) throw new Error('El usuario especificado no existe');
      const permission = await permissionRepository.findById(permissionIdInt);
      if (!permission) throw new Error('El permiso especificado no existe');
      if (!(await permissionRepository.userHasPermission(userIdInt, permissionIdInt))) throw new Error('El usuario no tiene asignado este permiso');

      if (permission.isCriticalPermission()) {
        const usersWithPermission = permission.getAssignedUsers();
        if (usersWithPermission.length <= 1) throw new Error('No se puede remover el último usuario con un permiso crítico');
      }

      const removed = await permissionRepository.removeFromUser(userIdInt, permissionIdInt);
      if (!removed) throw new Error('Error al remover permiso del usuario');

      const updatedUser = await userRepository.findById(userIdInt);
      return updatedUser.toPlainObject();
    } catch (error) {
      console.error('Error al remover permiso de usuario:', error);
      throw error;
    }
  }
}

export default new PermissionService();
