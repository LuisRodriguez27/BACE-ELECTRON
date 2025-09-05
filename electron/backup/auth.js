const db = require('../db');
const bcrypt = require('bcryptjs');

let currentUser = null; // Session en memoria

function login(username, password) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1');
  const user = stmt.get(username);
  
  if (!user) {
    return { success: false, message: 'Usuario no encontrado' };
  }
  
  const isValidPassword = bcrypt.compareSync(password, user.password);
  
  if (!isValidPassword) {
    return { success: false, message: 'Contraseña incorrecta' };
  }
  
  // Establecer usuario actual en sesión
  currentUser = {
    id: user.id,
    username: user.username,
    active: user.active
  };
  
  return { 
    success: true, 
    message: 'Login exitoso',
    user: currentUser
  };
}

function logout() {
  currentUser = null;
  return { success: true, message: 'Sesión cerrada' };
}

function getCurrentUser() {
  return currentUser;
}

function isAuthenticated() {
  return currentUser !== null;
}

function getUserWithPermissions() {
  if (!currentUser) return null;
  
  const stmt = db.prepare(`
    SELECT p.name, p.description 
    FROM permissions p 
    JOIN user_permissions up ON p.id = up.permission_id 
    WHERE up.user_id = ? AND p.active = 1
  `);
  const permissions = stmt.all(currentUser.id);
  
  return {
    ...currentUser,
    permissions: permissions.map(p => p.name)
  };
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getUserWithPermissions
};