import { useAuthStore } from '@/store/auth'
import { authService } from '@/features/auth/AuthService'
import logo from '@/assets/LOGO.jpg'

export function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Header de usuario - Solo en dashboard */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bienvenido, {user?.username}
            </h1>
            <p className="text-gray-600">Sistema de Ordenes BACE</p>
          </div>
          <button
            onClick={() => authService.logout()}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      
      {/* Logo centrado y responsivo */}
      <div className="flex justify-center items-center py-10">
        <img 
          src={logo} 
          alt="LOGO" 
          
        />        
      </div>

      
    </div>
  )
}
