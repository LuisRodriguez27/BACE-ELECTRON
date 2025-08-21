import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import Sidebar from '@/components/layout/Sidebar'

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
})
