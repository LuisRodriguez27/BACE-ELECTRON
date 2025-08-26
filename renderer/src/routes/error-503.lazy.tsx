import { createLazyFileRoute, Link } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/error-503')({
  component: ServiceUnavailablePage,
})

function ServiceUnavailablePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">503</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Servicio no disponible</h2>
          <p className="text-gray-600 mb-8">
            El servicio no está disponible temporalmente. Por favor, inténtalo más tarde.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
