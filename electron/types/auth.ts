/**
 * Tipos del agregado Auth / Sesión.
 * Espeja domain/auth.ts
 */

// ─── Row types ─────────────────────────────────────────────────────────────

export interface SessionUserData {
  id: number;
  username: string;
  active: boolean;
}

export interface SessionData {
  user?: SessionUserData | null;
  permissions?: string[];
  isActive?: boolean;
}
