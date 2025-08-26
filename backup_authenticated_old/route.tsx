import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'
import { authService } from '@/features/auth/AuthService'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    // Verificamos el estado de autenticación
    const isAuthenticated = await authService.checkAuthStatus()
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/iniciar-sesion',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Verificación periódica de autenticación (opcional)
    const interval = setInterval(async () => {
      const isAuth = await authService.isAuthenticated()
      if (!isAuth) {
        authService.logout()
        window.location.href = '/iniciar-sesion'
      }
    }, 5 * 60 * 1000) // cada 5 minutos

    return () => clearInterval(interval)
  }, [])

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header de usuario */}
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bienvenido, {user?.username}
                </h1>
                <p className="text-gray-600">Sistema de gestión empresarial</p>
              </div>
              <button
                onClick={() => authService.logout()}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          
          <Outlet />
        </div>
      </main>
    </div>
  )
}
