import type { SessionData, SessionUserData } from '../types/domain';

class Session {
  user: SessionUserData | null;
  permissions: string[];
  isActive: boolean;

  constructor({ user = null, permissions = [], isActive = false }: SessionData) {
    this.user = user ?? null;
    this.permissions = permissions || [];
    this.isActive = isActive;
  }

  isAuthenticated(): boolean { return this.isActive && this.user !== null; }
  hasUser(): boolean { return this.user !== null && this.user !== undefined; }
  hasPermissions(): boolean { return this.permissions && this.permissions.length > 0; }

  isValidUser(): boolean {
    return !!(this.user && this.user.id && this.user.username && this.user.active === true);
  }

  getUserId(): number | null { return this.hasUser() ? this.user!.id : null; }
  getUsername(): string | null { return this.hasUser() ? this.user!.username : null; }

  getUserInfo(): { id: number; username: string; active: boolean } | null {
    if (!this.hasUser()) return null;
    return { id: this.user!.id, username: this.user!.username, active: this.user!.active };
  }

  hasPermission(permissionName: string): boolean {
    if (!this.hasPermissions()) return false;
    return this.permissions.includes(permissionName);
  }

  hasAnyPermission(permissionNames: string[]): boolean {
    if (!Array.isArray(permissionNames)) return false;
    return permissionNames.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissionNames: string[]): boolean {
    if (!Array.isArray(permissionNames)) return false;
    return permissionNames.every(permission => this.hasPermission(permission));
  }

  getPermissionsList(): string[] { return [...this.permissions]; }

  canPerformAction(requiredPermission?: string): boolean {
    if (!this.isAuthenticated()) return false;
    if (!requiredPermission) return true;
    return this.hasPermission(requiredPermission);
  }

  isAdmin(): boolean { return this.hasAnyPermission(['admin', 'super_admin', 'system_admin']); }
  canManageUsers(): boolean { return this.hasPermission('manage_users') || this.isAdmin(); }
  canManagePermissions(): boolean { return this.hasPermission('manage_permissions') || this.isAdmin(); }

  getSessionStatus(): string {
    if (!this.isAuthenticated()) return 'unauthenticated';
    if (this.isAdmin()) return 'admin';
    if (this.hasPermissions()) return 'authenticated_with_permissions';
    return 'authenticated';
  }

  getSessionStatusLabel(): string {
    const labels: Record<string, string> = { unauthenticated: 'No autenticado', admin: 'Administrador', authenticated_with_permissions: 'Autenticado con permisos', authenticated: 'Autenticado' };
    return labels[this.getSessionStatus()] || this.getSessionStatus();
  }

  getDisplayName(): string {
    const username = this.getUsername();
    if (!username) return 'Usuario no autenticado';
    return `${username}${this.isAdmin() ? ' (Admin)' : ''}`;
  }

  getDisplaySummary(): string {
    if (!this.isAuthenticated()) return 'Sesión inactiva';
    const permissionCount = this.permissions.length;
    return `${permissionCount} ${permissionCount === 1 ? 'permiso' : 'permisos'} - Sesión activa`;
  }

  isValid(): boolean {
    if (!this.isActive) return true;
    return this.isValidUser() && Array.isArray(this.permissions);
  }

  activate(user: SessionUserData, permissions: string[] = []): void {
    this.user = user;
    this.permissions = permissions || [];
    this.isActive = true;
  }

  deactivate(): void { this.user = null; this.permissions = []; this.isActive = false; }

  toPlainObject() {
    return { user: this.getUserInfo(), permissions: this.getPermissionsList(), isActive: this.isActive, isAuthenticated: this.isAuthenticated(), sessionStatus: this.getSessionStatus(), sessionStatusLabel: this.getSessionStatusLabel(), displayName: this.getDisplayName(), displaySummary: this.getDisplaySummary(), isAdmin: this.isAdmin(), canManageUsers: this.canManageUsers(), canManagePermissions: this.canManagePermissions() };
  }
}

export default Session;
