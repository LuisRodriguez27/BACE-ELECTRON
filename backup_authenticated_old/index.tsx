import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth'

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Clientes</h3>
            <p className="text-2xl font-bold text-blue-900">--</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">Productos</h3>
            <p className="text-2xl font-bold text-green-900">--</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-600">Órdenes</h3>
            <p className="text-2xl font-bold text-yellow-900">--</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">Usuarios</h3>
            <p className="text-2xl font-bold text-purple-900">--</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Usuario</h3>
        <div className="space-y-2">
          <p><span className="font-medium">ID:</span> {user?.id}</p>
          <p><span className="font-medium">Usuario:</span> {user?.username}</p>
          <p><span className="font-medium">Estado:</span> 
            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
              user?.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user?.active ? 'Activo' : 'Inactivo'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
