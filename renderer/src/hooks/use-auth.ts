import { useAuthStore } from '@/store/auth'
import { authService } from '@/features/auth/AuthService'
import { useEffect } from 'react'

export function useAuth() {
  const authStore = useAuthStore()

  useEffect(() => {
    // Verificar el estado de autenticación al montar el componente
    const checkAuth = async () => {
      try {
        const isAuth = await authService.isAuthenticated()
        if (isAuth && !authStore.user) {
          // Si está autenticado pero no tenemos el usuario en el store
          await authService.getCurrentUser()
        } else if (!isAuth && authStore.user) {
          // Si no está autenticado pero tenemos usuario en el store
          authStore.reset()
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        authStore.reset()
      }
    }

    checkAuth()
  }, [authStore])

  return {
    user: authStore.user,
    isLoading: authStore.isLoading,
    error: authStore.error,
    isAuthenticated: authStore.isAuthenticated,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
    checkAuthStatus: authService.checkAuthStatus.bind(authService)
  }
}
