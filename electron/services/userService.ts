// eslint-disable-next-line @typescript-eslint/no-require-imports
const userRepository = require('../repositories/userRepository');

class UserService {
  async getAllUsers() {
    try {
      const users = await userRepository.findAll();
      return users.map((user: { toPlainObject: () => unknown }) => user.toPlainObject());
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw new Error('Error al obtener usuarios');
    }
  }

  async getUserById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de usuario inválido');
      const user = await userRepository.findById(parseInt(String(id)));
      if (!user) throw new Error('Usuario no encontrado');
      return user.toPlainObject();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  async createUser({ username, password }: { username: string; password: string }) {
    try {
      if (!username || !password) throw new Error('Username y password son requeridos');
      if (username.trim().length < 3) throw new Error('El username debe tener al menos 3 caracteres');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      if (await userRepository.existsByUsername(username.trim())) throw new Error('Este nombre de usuario ya está en uso');

      const hashedPassword = userRepository.constructor.hashPassword(password);
      const user = await userRepository.create({ username: username.trim(), hashedPassword });
      return user.toPlainObject();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  async updateUser(id: number | string, { username, password }: { username: string; password?: string | null }) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de usuario inválido');
      if (!username) throw new Error('Username es requerido');
      if (username.trim().length < 3) throw new Error('El username debe tener al menos 3 caracteres');

      const userId = parseInt(String(id));
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) throw new Error('Usuario no encontrado');
      if (await userRepository.existsByUsername(username.trim(), userId)) throw new Error('El username ya está en uso por otro usuario');

      let hashedPassword: string | null = null;
      if (password) {
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        hashedPassword = userRepository.constructor.hashPassword(password);
      }

      const updated = await userRepository.update(userId, { username: username.trim(), hashedPassword });
      if (!updated) throw new Error('Error al actualizar usuario');

      const updatedUser = await userRepository.findById(userId);
      return updatedUser.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  async deleteUser(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de usuario inválido');
      const userId = parseInt(String(id));
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) throw new Error('Usuario no encontrado');

      const allUsers = await userRepository.findAll();
      if (allUsers.length <= 1) throw new Error('No se puede eliminar el último usuario del sistema');

      const deleted = await userRepository.delete(userId);
      if (!deleted) throw new Error('Error al eliminar usuario');
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  async verifyPassword({ username, password }: { username: string; password: string }): Promise<boolean> {
    try {
      if (!username || !password) return false;
      const hashedPassword = await userRepository.getPasswordHash(username);
      if (!hashedPassword) return false;
      return userRepository.constructor.verifyPassword(password, hashedPassword);
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      return false;
    }
  }

  async checkUsernameExists(username: string, excludeUserId: number | null = null): Promise<boolean> {
    try {
      if (!username) return false;
      return await userRepository.existsByUsername(username.trim(), excludeUserId);
    } catch (error) {
      console.error('Error al verificar username:', error);
      return false;
    }
  }
}

module.exports = new UserService();
export {};
