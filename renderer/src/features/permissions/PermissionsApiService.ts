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
    return window.api.getPermissionById(id);
  },

  findByUserId: async (userId: number): Promise<Permission[]> => {
    return window.api.getPermissionsByUserId(userId);
  },

  create: async (permission: CreatePermissionForm): Promise<Permission> => {
    return window.api.createPermission(permission);
  },

  update: async (id: number, permission: EditPermissionForm): Promise<Permission> => {
    return window.api.updatePermission(id, permission);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deletePermission(id);
  },

  // User-Permission assignment methods
  assignToUser: async (assignment: AssignPermissionForm): Promise<void> => {
    // La API espera una string, convertimos el objeto a JSON
    return window.api.assignPermissionToUser(JSON.stringify(assignment));
  },

  removeFromUser: async (assignment: AssignPermissionForm): Promise<void> => {
    // La API espera una string, convertimos el objeto a JSON
    return window.api.removePermissionFromUser(JSON.stringify(assignment));
  }
};
