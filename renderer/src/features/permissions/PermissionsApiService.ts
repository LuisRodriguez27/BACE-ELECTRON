import type { 
  Permission, 
  CreatePermissionForm, 
  EditPermissionForm,
  AssignPermissionForm 
} from "./types";

export const PermissionsApiService = {
  findAll: async (): Promise<Permission[]> => {
    return window.api.getAllPermissions();
  },

  findById: async (id: number): Promise<Permission> => {
    return window.api.getPermissionsById(id);
  },

  findByUserId: async (userId: number): Promise<Permission[]> => {
    return window.api.getPermissionsByUserId(userId);
  },

  create: async (permission: CreatePermissionForm): Promise<Permission> => {
    return window.api.createPermission(permission);
  },

  update: async (id: number, permission: EditPermissionForm): Promise<{ success: boolean; message: string; data?: Permission }> => {
    return window.api.updatePermission(id, permission);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return window.api.deletePermission(id);
  },

  // User-Permission assignment methods
  assignToUser: async (assignment: AssignPermissionForm): Promise<{ success: boolean; message: string }> => {
    // Convertir snake_case a camelCase para la API
    return window.api.assignPermissionToUser({
      userId: assignment.user_id,
      permissionId: assignment.permission_id
    });
  },

  removeFromUser: async (assignment: AssignPermissionForm): Promise<{ success: boolean; message: string }> => {
    // Convertir snake_case a camelCase para la API  
    return window.api.removePermissionFromUser({
      userId: assignment.user_id,
      permissionId: assignment.permission_id
    });
  }
};
