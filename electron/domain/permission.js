class Permission {
  constructor({ 
    id, 
    name, 
    description, 
    active = true,
    users = []
  }) {
    this.id = id;
    this.name = name;
    this.description = description || null;
    this.active = active;
    this.users = users || [];
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  hasDescription() {
    return this.description && this.description.trim().length > 0;
  }

  hasUsers() {
    return this.users && this.users.length > 0;
  }

  // Validar nombre
  isValidName() {
    return this.name && this.name.trim().length > 0;
  }

  // Validar consistencia del permiso
  isValid() {
    return (
      this.isValidName() && 
      typeof this.active === 'number' && 
      (this.active === 0 || this.active === 1)
    );
  }

  // Para búsquedas y filtros
  matchesSearchTerm(searchTerm) {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (this.name && this.name.toLowerCase().includes(term)) ||
      (this.description && this.description.toLowerCase().includes(term)) ||
      (this.id && this.id.toString().includes(term))
    );
  }

  // Información del display
  getDisplayName() {
    return this.name || `Permiso #${this.id}`;
  }

  getDisplaySummary() {
    const description = this.hasDescription() ? this.description : 'Sin descripción';
    const userCount = this.users.length;
    const userText = userCount === 1 ? 'usuario' : 'usuarios';
    return `${description} - ${userCount} ${userText}`;
  }

  // Verificaciones de negocio
  canEdit() {
    return this.isActive();
  }

  canDelete() {
    // Un permiso se puede eliminar si no tiene usuarios asignados o si no es crítico
    return this.isActive() && !this.isCriticalPermission();
  }

  canAssignToUser(userId) {
    if (!this.isActive()) return false;
    if (!userId || userId <= 0) return false;
    
    // Verificar si el usuario ya tiene este permiso
    return !this.isAssignedToUser(userId);
  }

  // Verificar si es un permiso crítico del sistema
  isCriticalPermission() {
    const criticalPermissions = [
      'admin',
      'super_admin',
      'system_admin',
      'manage_users',
      'manage_permissions'
    ];
    return criticalPermissions.some(critical => 
      this.name.toLowerCase().includes(critical.toLowerCase())
    );
  }

  // Verificar si está asignado a un usuario específico
  isAssignedToUser(userId) {
    return this.users.some(user => user.id === userId);
  }

  // Obtener usuarios asignados
  getAssignedUsers() {
    return this.users.filter(user => user.active === 1);
  }

  getActiveUserCount() {
    return this.getAssignedUsers().length;
  }

  // Estado del permiso
  getStatus() {
    if (!this.isActive()) return 'inactive';
    if (this.isCriticalPermission()) return 'critical';
    if (this.hasUsers()) return 'active';
    return 'unused';
  }

  getStatusLabel() {
    const status = this.getStatus();
    const labels = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'critical': 'Crítico',
      'unused': 'Sin uso'
    };
    return labels[status] || status;
  }

  getStatusColor() {
    const status = this.getStatus();
    const colors = {
      'active': 'green',
      'inactive': 'gray',
      'critical': 'red',
      'unused': 'yellow'
    };
    return colors[status] || 'gray';
  }

  // Formatear información
  getFormattedName() {
    return this.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  }

  // Validaciones de negocio específicas
  static isValidPermissionName(name) {
    if (!name || typeof name !== 'string') return false;
    
    // El nombre debe tener al menos 2 caracteres y solo contener letras, números y guiones bajos
    const nameRegex = /^[a-zA-Z0-9_]{2,50}$/;
    return nameRegex.test(name.trim());
  }

  static PERMISSION_TYPES = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin'
  };

  // Determinar tipo de permiso basado en el nombre
  getPermissionType() {
    const name = this.name.toLowerCase();
    
    if (name.includes('admin') || name.includes('manage')) {
      return Permission.PERMISSION_TYPES.ADMIN;
    }
    if (name.includes('delete') || name.includes('remove')) {
      return Permission.PERMISSION_TYPES.DELETE;
    }
    if (name.includes('create') || name.includes('update') || name.includes('edit')) {
      return Permission.PERMISSION_TYPES.WRITE;
    }
    if (name.includes('read') || name.includes('view') || name.includes('list')) {
      return Permission.PERMISSION_TYPES.READ;
    }
    
    return Permission.PERMISSION_TYPES.READ; // Por defecto
  }

  getPermissionTypeLabel() {
    const type = this.getPermissionType();
    const labels = {
      'read': 'Lectura',
      'write': 'Escritura',
      'delete': 'Eliminación',
      'admin': 'Administración'
    };
    return labels[type] || type;
  }

  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      active: this.active,
      users: this.users,
      isActive: this.isActive(),
      hasDescription: this.hasDescription(),
      hasUsers: this.hasUsers(),
      displayName: this.getDisplayName(),
      displaySummary: this.getDisplaySummary(),
      formattedName: this.getFormattedName(),
      status: this.getStatus(),
      statusLabel: this.getStatusLabel(),
      statusColor: this.getStatusColor(),
      permissionType: this.getPermissionType(),
      permissionTypeLabel: this.getPermissionTypeLabel(),
      isCritical: this.isCriticalPermission(),
      activeUserCount: this.getActiveUserCount(),
      canEdit: this.canEdit(),
      canDelete: this.canDelete()
    };
  }
}

module.exports = Permission;
