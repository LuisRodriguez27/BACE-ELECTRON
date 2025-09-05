const db = require('../db');
const bcrypt = require('bcryptjs');
const Session = require('../domain/auth');

class AuthRepository {
  constructor() {
    this.currentSession = new Session({});
  }

  findUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1');
    return stmt.get(username);
  }

  validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  getUserPermissions(userId) {
    const stmt = db.prepare(`
      SELECT p.name, p.description 
      FROM permissions p 
      JOIN user_permissions up ON p.id = up.permission_id 
      WHERE up.user_id = ? AND p.active = 1
    `);
    return stmt.all(userId);
  }

  createSession(user) {
    const permissions = this.getUserPermissions(user.id);
    const permissionNames = permissions.map(p => p.name);
    
    const userData = {
      id: user.id,
      username: user.username,
      active: user.active
    };

    this.currentSession.activate(userData, permissionNames);
    return this.currentSession;
  }

  destroySession() {
    this.currentSession.deactivate();
    return this.currentSession;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  isSessionActive() {
    return this.currentSession.isAuthenticated();
  }

  getSessionWithPermissions() {
    if (!this.currentSession.isAuthenticated()) return null;
    
    const permissions = this.getUserPermissions(this.currentSession.getUserId());
    const permissionNames = permissions.map(p => p.name);
    
    // Actualizar permisos en la sesión actual
    this.currentSession.permissions = permissionNames;
    
    return this.currentSession;
  }
}

module.exports = new AuthRepository();
