const userRepository = require('../repositories/userRepository');

class UserService {

  async getAllUsers() {
    try {
      const users = await userRepository.findAll();
      return users.map(user => user.toPlainObject());
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw new Error('Error al obtener usuarios');
    }
  }

  async getUserById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de usuario inválido');
      }

      const user = await userRepository.findById(parseInt(id));
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user.toPlainObject();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  async createUser({ username, password }) {
    try {
      // Validaciones de negocio
      if (!username || !password) {
        throw new Error('Username y password son requeridos');
      }

      if (username.trim().length < 3) {
        throw new Error('El username debe tener al menos 3 caracteres');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Verificar si el username ya existe
      if (await userRepository.existsByUsername(username.trim())) {
        throw new Error('Este nombre de usuario ya está en uso');
      }

      // Crear usuario
      const hashedPassword = await userRepository.constructor.hashPassword(password);
      const user = await userRepository.create({
        username: username.trim(),
        hashedPassword
      });

      const result = user.toPlainObject();
      return result;

    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  async updateUser(id, { username, password }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de usuario inválido');
      }

      if (!username) {
        throw new Error('Username es requerido');
      }

      if (username.trim().length < 3) {
        throw new Error('El username debe tener al menos 3 caracteres');
      }

      const userId = parseInt(id);

      // Verificar si el usuario existe
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar si el username ya está en uso por otro usuario
      if (await userRepository.existsByUsername(username.trim(), userId)) {
        throw new Error('El username ya está en uso por otro usuario');
      }

      // Validar password si se proporciona
      let hashedPassword = null;
      if (password) {
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        hashedPassword = await userRepository.constructor.hashPassword(password);
      }

      // Actualizar usuario
      const updated = await userRepository.update(userId, {
        username: username.trim(),
        hashedPassword
      });

      if (!updated) {
        throw new Error('Error al actualizar usuario');
      }

      // Obtener usuario actualizado
      const updatedUser = await userRepository.findById(userId);

      return updatedUser.toPlainObject();
      
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de usuario inválido');
      }

      const userId = parseInt(id);

      // Verificar si el usuario existe
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error('Usuario no encontrado');
      }

      // Lógica de negocio: evitar eliminar el último usuario activo
      const allUsers = await userRepository.findAll();
      if (allUsers.length <= 1) {
        throw new Error('No se puede eliminar el último usuario del sistema');
      }

      const deleted = await userRepository.delete(userId);

      if (!deleted) {
        throw new Error('Error al eliminar usuario');
      }

      // El frontend espera void, no retornamos nada
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  async verifyPassword({ username, password }) {
    try {
      if (!username || !password) {
        return false;
      }

      const hashedPassword = await userRepository.getPasswordHash(username);
      
      if (!hashedPassword) {
        return false;
      }

      return await userRepository.constructor.verifyPassword(password, hashedPassword);
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      return false;
    }
  }

  async checkUsernameExists(username, excludeUserId = null) {
    try {
      if (!username) {
        return false;
      }

      return await userRepository.existsByUsername(username.trim(), excludeUserId);
      
    } catch (error) {
      console.error('Error al verificar username:', error);
      return false;
    }
  }
}

module.exports = new UserService();
