import { createFileRoute } from '@tanstack/react-router'

// Componente temporal para configuraciones
const ConfigurationsPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuraciones</h1>
        <p className="text-gray-600 mt-2">
          Configura los parámetros del sistema y preferencias de usuario
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Configuración General</h2>
          <p className="text-gray-500">
            Funcionalidad en desarrollo...
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Preferencias de Usuario</h2>
          <p className="text-gray-500">
            Funcionalidad en desarrollo...
          </p>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/configurations')({
  component: ConfigurationsPage
})
