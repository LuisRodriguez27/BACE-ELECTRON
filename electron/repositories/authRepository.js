const db = require('../db');
const bcrypt = require('bcryptjs');
const Session = require('../domain/auth');

class AuthRepository {
  constructor() {
    this.currentSession = new Session({});
  }

  async findUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND active = true');
    return await stmt.get(username);
  }

  async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  async getUserPermissions(userId) {
    const stmt = db.prepare(`
      SELECT p.name, p.description 
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = ? AND p.active = true
    `);
    return await stmt.all(userId);
  }

  async createSession(user) {
    const permissions = await this.getUserPermissions(user.id);
    const permissionNames = permissions.map(p => p.name);
    
    const userData = {
      id: user.id,
      username: user.username,
      active: user.active
    };

    this.currentSession.activate(userData, permissionNames);
    return this.currentSession;
  }

  async destroySession() {
    this.currentSession.deactivate();
    return this.currentSession;
  }

  async getCurrentSession() {
    return this.currentSession;
  }

  async isSessionActive() {
    return this.currentSession.isAuthenticated();
  }

  async getSessionWithPermissions() {
    if (!this.currentSession.isAuthenticated()) return null;
    
    const permissions = await this.getUserPermissions(this.currentSession.getUserId());
    const permissionNames = permissions.map(p => p.name);
    
    // Actualizar permisos en la sesión actual
    this.currentSession.permissions = permissionNames;
    
    return this.currentSession;
  }
}

module.exports = new AuthRepository();
