class User {
  constructor({ id, username, active = 1, userPermissions = [] }) {
    this.id = id;
    this.username = username;
    this.active = active;
    this.userPermissions = userPermissions;
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === 1;
  }

  hasPermission(permissionName) {
    return this.userPermissions.some(
      permission => permission.permission_name === permissionName && permission.active === 1
    );
  }

  getActivePermissions() {
    return this.userPermissions.filter(permission => permission.active === 1);
  }

  toPlainObject() {
    return {
      id: this.id,
      username: this.username,
      active: this.active,
      userPermissions: this.userPermissions
    };
  }
}

module.exports = User;
