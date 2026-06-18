import type { UserRow } from '../types/user';
import type { UserPermission } from '../types/user';

class User {
  id: number;
  username: string;
  active: boolean;
  userPermissions: UserPermission[];

  constructor({ id, username, active = true, userPermissions = [] }: UserRow & { userPermissions?: UserPermission[] }) {
    this.id = id;
    this.username = username;
    this.active = active;
    this.userPermissions = userPermissions;
  }

  isActive(): boolean {
    return this.active === true;
  }

  hasPermission(permissionName: string): boolean {
    return this.userPermissions.some(
      permission => permission.permission_name === permissionName && permission.active === true
    );
  }

  getActivePermissions(): UserPermission[] {
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

export default User;
