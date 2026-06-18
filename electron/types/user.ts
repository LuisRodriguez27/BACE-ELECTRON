/**
 * Tipos del agregado User.
 * Espeja domain/user.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────
// Contrato entre repositorio y clase de dominio (lo que devuelve la DB).

export interface UserRow {
  id: number;
  username: string;
  password: string;
  active: boolean;
}

export interface UserPermission {
  id: number;
  permission_name: string;
  user_id: number;
  permission_id: number;
  active: boolean;
}

// ─── Input / DTO types ─────────────────────────────────────────────────────
// Contrato entre el renderer y los handlers IPC (lo que recibe el servicio).

export interface CreateUserData {
  username: string;
  password: string;
}

export interface UpdateUserData {
  username: string;
  password?: string | null;
}

export interface VerifyPasswordData {
  username: string;
  password: string;
}
