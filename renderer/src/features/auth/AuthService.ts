import { useAuthStore } from "@/store/auth";
import type { LoginCredentials, LoginResponse, User } from "./types";

class AuthService {
  private authStore = useAuthStore;

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      this.authStore.getState().setLoading(true);
      this.authStore.getState().setError(null);

      const response = await window.api.login(credentials);
      
      if (response.success && response.user) {
        this.authStore.getState().setUser(response.user);
        // Obtener permisos del usuario
        await this.loadUserPermissions(response.user.id);
        return response;
      } else {
        this.authStore.getState().setError(response.message);
        return response;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.authStore.getState().setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      this.authStore.getState().setLoading(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await window.api.logout();
      this.authStore.getState().reset();
      // Redirigir al login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Forzamos el reset del estado local incluso si hay error
      this.authStore.getState().reset();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await window.api.getCurrentUser();
      if (user) {
        this.authStore.getState().setUser(user);
        // Cargar permisos al obtener usuario actual
        await this.loadUserPermissions(user.id);
      }
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  private async loadUserPermissions(userId: number): Promise<void> {
    try {
      // Obtener permisos reales del usuario desde la API
      const userWithPermissions = await window.api.getUserWithPermissions();
      
      if (userWithPermissions && userWithPermissions.permissions) {
        this.authStore.getState().setUserPermissions(userWithPermissions.permissions);
      } else {
        this.authStore.getState().setUserPermissions([]);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      this.authStore.getState().setUserPermissions([]);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      return await window.api.isAuthenticated();
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Método para verificar autenticación y sincronizar estado
  async checkAuthStatus(): Promise<boolean> {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        this.authStore.getState().reset();
        return false;
      }

      // Si está autenticado pero no tenemos usuario en el store, lo obtenemos
      const currentState = this.authStore.getState();
      if (!currentState.user) {
        const user = await this.getCurrentUser();
        return !!user;
      }

      return true;
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.authStore.getState().reset();
      return false;
    }
  }
}

export const authService = new AuthService();
