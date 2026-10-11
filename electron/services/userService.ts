import userRepository, { UserRepository } from '../repositories/userRepository';
import type { CreateUserData, UpdateUserData, VerifyPasswordData } from '../types/user';
import db from '../db';

class UserService {
  async getAllUsers() {
    try {
      const users = await userRepository.findAll();
      return users.map((user) => user.toPlainObject());
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw new Error('Error al obtener usuarios');
    }
  }

  async getUserById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de usuario inválido');
      const user = await userRepository.findById(id);
      if (!user) throw new Error('Usuario no encontrado');
      return user.toPlainObject();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  async createUser(data: CreateUserData) {
    try {
      const { username, password } = data;
      if (!username || !password) throw new Error('Username y password son requeridos');
      if (username.trim().length < 3) throw new Error('El username debe tener al menos 3 caracteres');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

      const transaction = db.transaction(async () => {
        if (await userRepository.existsByUsername(username.trim())) throw new Error('Este nombre de usuario ya está en uso');

        const hashedPassword = UserRepository.hashPassword(password);
        const user = await userRepository.create({ username: username.trim(), hashedPassword });
        return user.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  async updateUser(id: number, data: UpdateUserData) {
    try {
      if (!id || id <= 0) throw new Error('ID de usuario inválido');
      const { username, password } = data;
      if (!username) throw new Error('Username es requerido');
      if (username.trim().length < 3) throw new Error('El username debe tener al menos 3 caracteres');

      const transaction = db.transaction(async () => {
        const existingUser = await userRepository.findById(id);
        if (!existingUser) throw new Error('Usuario no encontrado');
        if (await userRepository.existsByUsername(username.trim(), id)) throw new Error('El username ya está en uso por otro usuario');

        let hashedPassword: string | undefined = undefined;
        if (password) {
          if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
          hashedPassword = UserRepository.hashPassword(password);
        }

        const updated = await userRepository.update(id, { username: username.trim(), hashedPassword });
        if (!updated) throw new Error('Error al actualizar usuario');

        const updatedUser = await userRepository.findById(id);
        if (!updatedUser) throw new Error('Error al actualizar usuario');
        return updatedUser.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  }

  async deleteUser(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de usuario inválido');

      const transaction = db.transaction(async () => {
        const existingUser = await userRepository.findById(id);
        if (!existingUser) throw new Error('Usuario no encontrado');

        const allUsers = await userRepository.findAll();
        if (allUsers.length <= 1) throw new Error('No se puede eliminar el último usuario del sistema');

        const deleted = await userRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar usuario');
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  async verifyPassword(data: VerifyPasswordData): Promise<boolean> {
    try {
      const { username, password } = data;
      if (!username || !password) return false;
      const hashedPassword = await userRepository.getPasswordHash(username);
      if (!hashedPassword) return false;
      return UserRepository.verifyPassword(password, hashedPassword);
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

export default new UserService();
