class Session {
  constructor({ 
    user = null,
    permissions = [],
    isActive = false
  }) {
    this.user = user;
    this.permissions = permissions || [];
    this.isActive = isActive;
  }

  // Métodos de utilidad para el dominio
  isAuthenticated() {
    return this.isActive && this.user !== null;
  }

  hasUser() {
    return this.user !== null && this.user !== undefined;
  }

  hasPermissions() {
    return this.permissions && this.permissions.length > 0;
  }

  // Validar usuario
  isValidUser() {
    return this.user && 
      this.user.id && 
      this.user.username && 
      this.user.active === true;
  }

  // Información del usuario
  getUserId() {
    return this.hasUser() ? this.user.id : null;
  }

  getUsername() {
    return this.hasUser() ? this.user.username : null;
  }

  getUserInfo() {
    if (!this.hasUser()) return null;
    return {
      id: this.user.id,
      username: this.user.username,
      active: this.user.active
    };
  }

  // Manejo de permisos
  hasPermission(permissionName) {
    if (!this.hasPermissions()) return false;
    return this.permissions.includes(permissionName);
  }

  hasAnyPermission(permissionNames) {
    if (!Array.isArray(permissionNames)) return false;
    return permissionNames.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissionNames) {
    if (!Array.isArray(permissionNames)) return false;
    return permissionNames.every(permission => this.hasPermission(permission));
  }

  getPermissionsList() {
    return [...this.permissions];
  }

  // Verificaciones de negocio
  canPerformAction(requiredPermission) {
    if (!this.isAuthenticated()) return false;
    if (!requiredPermission) return true; // Si no se requiere permiso específico
    return this.hasPermission(requiredPermission);
  }

  isAdmin() {
    return this.hasAnyPermission(['admin', 'super_admin', 'system_admin']);
  }

  canManageUsers() {
    return this.hasPermission('manage_users') || this.isAdmin();
  }

  canManagePermissions() {
    return this.hasPermission('manage_permissions') || this.isAdmin();
  }

  // Estado de la sesión
  getSessionStatus() {
    if (!this.isAuthenticated()) return 'unauthenticated';
    if (this.isAdmin()) return 'admin';
    if (this.hasPermissions()) return 'authenticated_with_permissions';
    return 'authenticated';
  }

  getSessionStatusLabel() {
    const status = this.getSessionStatus();
    const labels = {
      'unauthenticated': 'No autenticado',
      'admin': 'Administrador',
      'authenticated_with_permissions': 'Autenticado con permisos',
      'authenticated': 'Autenticado'
    };
    return labels[status] || status;
  }

  // Para display
  getDisplayName() {
    const username = this.getUsername();
    if (!username) return 'Usuario no autenticado';
    
    const status = this.isAdmin() ? ' (Admin)' : '';
    return `${username}${status}`;
  }

  getDisplaySummary() {
    if (!this.isAuthenticated()) return 'Sesión inactiva';
    
    const permissionCount = this.permissions.length;
    const permissionText = permissionCount === 1 ? 'permiso' : 'permisos';

    return `${permissionCount} ${permissionText} - Sesión activa`;
  }

  // Validar consistencia de la sesión
  isValid() {
    if (!this.isActive) return true; // Sesión inactiva es válida
    
    return (
      this.isValidUser() &&
      Array.isArray(this.permissions) 
    );
  }

  // Activar sesión
  activate(user, permissions = []) {
    this.user = user;
    this.permissions = permissions || [];
    this.isActive = true;
  }

  // Desactivar sesión
  deactivate() {
    this.user = null;
    this.permissions = [];
    this.isActive = false;
  }

  toPlainObject() {
    return {
      user: this.getUserInfo(),
      permissions: this.getPermissionsList(),
      isActive: this.isActive,
      isAuthenticated: this.isAuthenticated(),
      sessionStatus: this.getSessionStatus(),
      sessionStatusLabel: this.getSessionStatusLabel(),
      displayName: this.getDisplayName(),
      displaySummary: this.getDisplaySummary(),
      isAdmin: this.isAdmin(),
      canManageUsers: this.canManageUsers(),
      canManagePermissions: this.canManagePermissions()
    };
  }
}

module.exports = Session;
