import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import Sidebar from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
        <Toaster 
          position="top-right"
          richColors
          expand={true}
          duration={4000}
        />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})
