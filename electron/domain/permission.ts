import type { PermissionRow } from '../types/domain';

interface PermissionUser {
  id: number;
  username: string;
  active: boolean;
}

class Permission {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  users: PermissionUser[];

  constructor({ id, name, description, active = true, users = [] }: PermissionRow & { users?: PermissionUser[] }) {
    this.id = id;
    this.name = name;
    this.description = description || null;
    this.active = active;
    this.users = users || [];
  }

  static PERMISSION_TYPES = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin'
  } as const;

  isActive(): boolean { return this.active === true; }
  hasDescription(): boolean { return !!(this.description && this.description.trim().length > 0); }
  hasUsers(): boolean { return this.users && this.users.length > 0; }
  isValidName(): boolean { return !!(this.name && this.name.trim().length > 0); }

  isValid(): boolean {
    return this.isValidName() && typeof this.active === 'boolean';
  }

  matchesSearchTerm(searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      !!(this.name && this.name.toLowerCase().includes(term)) ||
      !!(this.description && this.description.toLowerCase().includes(term)) ||
      !!(this.id && this.id.toString().includes(term))
    );
  }

  getDisplayName(): string { return this.name || `Permiso #${this.id}`; }

  getDisplaySummary(): string {
    const description = this.hasDescription() ? this.description : 'Sin descripción';
    const userCount = this.users.length;
    const userText = userCount === 1 ? 'usuario' : 'usuarios';
    return `${description} - ${userCount} ${userText}`;
  }

  canEdit(): boolean { return this.isActive(); }
  canDelete(): boolean { return this.isActive() && !this.isCriticalPermission(); }

  canAssignToUser(userId: number): boolean {
    if (!this.isActive()) return false;
    if (!userId || userId <= 0) return false;
    return !this.isAssignedToUser(userId);
  }

  isCriticalPermission(): boolean {
    const criticalPermissions = ['admin', 'super_admin', 'system_admin', 'manage_users', 'manage_permissions'];
    return criticalPermissions.some(critical => this.name.toLowerCase().includes(critical.toLowerCase()));
  }

  isAssignedToUser(userId: number): boolean {
    return this.users.some(user => user.id === userId);
  }

  getAssignedUsers(): PermissionUser[] {
    return this.users.filter(user => user.active === true);
  }

  getActiveUserCount(): number { return this.getAssignedUsers().length; }

  getStatus(): string {
    if (!this.isActive()) return 'inactive';
    if (this.isCriticalPermission()) return 'critical';
    if (this.hasUsers()) return 'active';
    return 'unused';
  }

  getStatusLabel(): string {
    const labels: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', critical: 'Crítico', unused: 'Sin uso' };
    return labels[this.getStatus()] || this.getStatus();
  }

  getStatusColor(): string {
    const colors: Record<string, string> = { active: 'green', inactive: 'gray', critical: 'red', unused: 'yellow' };
    return colors[this.getStatus()] || 'gray';
  }

  getFormattedName(): string {
    return this.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  }

  static isValidPermissionName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;
    const nameRegex = /^[a-zA-Z0-9_]{2,50}$/;
    return nameRegex.test(name.trim());
  }

  getPermissionType(): string {
    const name = this.name.toLowerCase();
    if (name.includes('admin') || name.includes('manage')) return Permission.PERMISSION_TYPES.ADMIN;
    if (name.includes('delete') || name.includes('remove')) return Permission.PERMISSION_TYPES.DELETE;
    if (name.includes('create') || name.includes('update') || name.includes('edit')) return Permission.PERMISSION_TYPES.WRITE;
    return Permission.PERMISSION_TYPES.READ;
  }

  getPermissionTypeLabel(): string {
    const labels: Record<string, string> = { read: 'Lectura', write: 'Escritura', delete: 'Eliminación', admin: 'Administración' };
    return labels[this.getPermissionType()] || this.getPermissionType();
  }

  toPlainObject() {
    return {
      id: this.id, name: this.name, description: this.description, active: this.active, users: this.users,
      isActive: this.isActive(), hasDescription: this.hasDescription(), hasUsers: this.hasUsers(),
      displayName: this.getDisplayName(), displaySummary: this.getDisplaySummary(),
      formattedName: this.getFormattedName(), status: this.getStatus(), statusLabel: this.getStatusLabel(),
      statusColor: this.getStatusColor(), permissionType: this.getPermissionType(),
      permissionTypeLabel: this.getPermissionTypeLabel(), isCritical: this.isCriticalPermission(),
      activeUserCount: this.getActiveUserCount(), canEdit: this.canEdit(), canDelete: this.canDelete()
    };
  }
}

export default Permission;
