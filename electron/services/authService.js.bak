const authRepository = require('../repositories/authRepository');
const Session = require('../domain/auth');

class AuthService {

  async login(username, password) {
    try {
      // Validaciones de entrada
      if (!username || typeof username !== 'string') {
        throw new Error('El nombre de usuario es requerido');
      }

      if (!password || typeof password !== 'string') {
        throw new Error('La contraseña es requerida');
      }

      const trimmedUsername = username.trim();
      
      if (trimmedUsername.length === 0) {
        throw new Error('El nombre de usuario no puede estar vacío');
      }

      if (password.length === 0) {
        throw new Error('La contraseña no puede estar vacía');
      }

      // Buscar usuario
      const user = await authRepository.findUserByUsername(trimmedUsername);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar que el usuario esté activo
      if (user.active !== true) {
        throw new Error('Usuario inactivo');
      }

      // Validar contraseña
      const isValidPassword = await authRepository.validatePassword(password, user.password);
      
      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Crear sesión
      const session = await authRepository.createSession(user);

      return {
        success: true,
        message: 'Login exitoso',
        user: session.getUserInfo(),
        session: session.toPlainObject()
      };

    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        message: error.message || 'Error durante el login'
      };
    }
  }

  async logout() {
    try {
      const session = await authRepository.destroySession();
      
      return {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };

    } catch (error) {
      console.error('Error en logout:', error);
      return {
        success: false,
        message: 'Error durante el logout'
      };
    }
  }

  async getCurrentUser() {
    try {
      const session = await authRepository.getCurrentSession();
      
      if (!session.isAuthenticated()) {
        return null;
      }

      return session.getUserInfo();

    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }

  async isAuthenticated() {
    try {
      return await authRepository.isSessionActive();
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      return false;
    }
  }

  async getUserWithPermissions() {
    try {
      const session = await authRepository.getSessionWithPermissions();
      
      if (!session) {
        return null;
      }

      return {
        ...session.getUserInfo(),
        permissions: session.getPermissionsList(),
        sessionInfo: {
          isAdmin: session.isAdmin(),
          canManageUsers: session.canManageUsers(),
          canManagePermissions: session.canManagePermissions()
        }
      };

    } catch (error) {
      console.error('Error al obtener usuario con permisos:', error);
      return null;
    }
  }

  async getSessionInfo() {
    try {
      const session = await authRepository.getCurrentSession();
      
      if (!session.isAuthenticated()) {
        return {
          isAuthenticated: false,
          session: null
        };
      }

      return {
        isAuthenticated: true,
        session: session.toPlainObject()
      };

    } catch (error) {
      console.error('Error al obtener información de sesión:', error);
      return {
        isAuthenticated: false,
        session: null
      };
    }
  }

  async requireAuth() {
    try {
      const isAuth = await this.isAuthenticated();
      
      if (!isAuth) {
        return {
          success: false,
          message: 'No autorizado'
        };
      }

      return {
        success: true,
        message: 'Usuario autenticado'
      };

    } catch (error) {
      console.error('Error en requireAuth:', error);
      return {
        success: false,
        message: 'Error de autenticación'
      };
    }
  }

  async hasPermission(permissionName) {
    try {
      if (!permissionName || typeof permissionName !== 'string') {
        return false;
      }

      const session = await authRepository.getCurrentSession();
      
      if (!session.isAuthenticated()) {
        return false;
      }

      return session.hasPermission(permissionName.trim());

    } catch (error) {
      console.error('Error al verificar permiso:', error);
      return false;
    }
  }

  async hasAnyPermission(permissionNames) {
    try {
      if (!Array.isArray(permissionNames)) {
        return false;
      }

      const session = await authRepository.getCurrentSession();
      
      if (!session.isAuthenticated()) {
        return false;
      }

      return session.hasAnyPermission(permissionNames);

    } catch (error) {
      console.error('Error al verificar permisos:', error);
      return false;
    }
  }

  async canPerformAction(requiredPermission) {
    try {
      const session = await authRepository.getCurrentSession();
      
      if (!session.isAuthenticated()) {
        return {
          canPerform: false,
          reason: 'Usuario no autenticado'
        };
      }

      const canPerform = session.canPerformAction(requiredPermission);
      
      return {
        canPerform,
        reason: canPerform ? 'Autorizado' : 'Permisos insuficientes',
        userPermissions: session.getPermissionsList(),
        requiredPermission
      };

    } catch (error) {
      console.error('Error al verificar acción:', error);
      return {
        canPerform: false,
        reason: 'Error de verificación'
      };
    }
  }
}

module.exports = new AuthService();
