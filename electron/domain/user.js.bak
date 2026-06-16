class User {
  constructor({ id, username, active = true, userPermissions = [] }) {
    this.id = id;
    this.username = username;
    this.active = active;
    this.userPermissions = userPermissions;
  }

  // Métodos de utilidad para el dominio
  isActive() {
    return this.active === true;
  }

  hasPermission(permissionName) {
    return this.userPermissions.some(
      permission => permission.permission_name === permissionName && permission.active === true
    );
  }

  getActivePermissions() {
    return this.userPermissions.filter(permission => permission.active === true);
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
