import { createFileRoute } from '@tanstack/react-router'

// Componente temporal para historial de órdenes
const HistoryPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Órdenes</h1>
        <p className="text-gray-600 mt-2">
          Consulta el historial completo de órdenes procesadas
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Historial</h2>
        <p className="text-gray-500">
          Funcionalidad en desarrollo...
        </p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/history')({
  component: HistoryPage
})
