/**
 * Tipos del agregado Permission.
 * Espeja domain/permission.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface PermissionRow {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

export interface PermissionUser {
  id: number;
  username: string;
  active: boolean;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────

export interface CreatePermissionData {
  name: string;
  description?: string | null;
}

export interface UpdatePermissionData {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface AssignPermissionData {
  userId: number;
  permissionId: number;
}
