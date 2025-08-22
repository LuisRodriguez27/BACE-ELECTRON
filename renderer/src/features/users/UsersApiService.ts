import type { User, CreateUserForm, EditUserForm } from "./types";

export const UsersApiService = {
  findAll: async (): Promise<User[]> => {
    return window.api.getAllUsers();
  },

  findById: async (id: number): Promise<User> => {
    return window.api.getUserById(id);
  },

  create: async (user: CreateUserForm): Promise<User> => {
    return window.api.createUser(user);
  },

  update: async (id: number, user: EditUserForm): Promise<User> => {
    return window.api.updateUser(id, user);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteUser(id);
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    return window.api.verifyPassword(password);
  }
};
