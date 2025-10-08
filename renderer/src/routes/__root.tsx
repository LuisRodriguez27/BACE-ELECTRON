import { createRootRoute, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster 
        position="top-right"
        richColors
        expand={true}
        duration={3000}
        closeButton={true}
      />
      {/* <TanStackRouterDevtools /> */}
    </>
  ),
})
