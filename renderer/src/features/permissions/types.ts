import { z } from 'zod';

export const createPermissionSchema = z.object({
  name: z.string().min(1, 'El nombre del permiso es obligatorio'),
  description: z.string().optional()
});

export const editPermissionSchema = createPermissionSchema.partial();

export type CreatePermissionForm = z.infer<typeof createPermissionSchema>;
export type EditPermissionForm = z.infer<typeof editPermissionSchema>;

export interface Permission {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export interface UserPermission {
  user_id: number;
  permission_id: number;
  active: boolean;
  // Relacionadas para joins
  user?: {
    id: number;
    username: string;
  };
  permission?: Permission;
}

export const assignPermissionSchema = z.object({
  user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
  permission_id: z.number().int().min(1, 'El ID del permiso es obligatorio')
});

export type AssignPermissionForm = z.infer<typeof assignPermissionSchema>;
