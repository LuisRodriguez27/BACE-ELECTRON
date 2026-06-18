import db from '../db';
import * as bcryptjs from 'bcryptjs';
import User from '../domain/user';
import Session from '../domain/auth';

const saltRounds = 10;

class AuthRepository {
  currentSession: InstanceType<typeof Session>;

  constructor() {
    this.currentSession = new Session({});
  }

  async findUserByUsername(username: string) {
    return await db.getOne('SELECT * FROM users WHERE username = $1 AND active = true', [username]);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcryptjs.compareSync(plainPassword, hashedPassword);
  }

  async getUserPermissions(userId: number) {
    return await db.getAll(`
      SELECT p.name, p.description 
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = $1 AND p.active = true
    `, [userId]);
  }

  async createSession(user: { id: number; username: string; active: boolean }) {
    const permissions = await this.getUserPermissions(user.id);
    const permissionNames = permissions.map(p => p.name as string);
    
    const userData = { id: user.id, username: user.username, active: user.active };
    this.currentSession.activate(userData, permissionNames);
    return this.currentSession;
  }

  async destroySession() {
    this.currentSession.deactivate();
    return this.currentSession;
  }

  async getCurrentSession() { return this.currentSession; }
  async isSessionActive(): Promise<boolean> { return this.currentSession.isAuthenticated(); }

  async getSessionWithPermissions() {
    if (!this.currentSession.isAuthenticated()) return null;
    const permissions = await this.getUserPermissions(this.currentSession.getUserId()!);
    const permissionNames = permissions.map(p => p.name as string);
    this.currentSession.permissions = permissionNames;
    return this.currentSession;
  }
}

export default new AuthRepository();
