import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'
import { authService } from '@/features/auth/AuthService'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    // Verificamos el estado de autenticación
    const isAuthenticated = await authService.checkAuthStatus()
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Verificación periódica de autenticación (opcional)
    const interval = setInterval(async () => {
      const isAuth = await authService.isAuthenticated()
      if (!isAuth) {
        authService.logout()
        window.location.href = '/login'
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
          <Outlet />
        </div>
      </main>
    </div>
  )
}
