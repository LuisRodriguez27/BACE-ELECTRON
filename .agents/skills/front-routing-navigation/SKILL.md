---
name: routing-navigation
description: "Triggers when managing routes, layouts, navigation links, route protection, or TanStack Router configuration in the frontend."
---

# Routing and Navigation (TanStack Router & Layouts)

This skill explains how routing, navigation, layouts, and route protection are structured in the Vite/React frontend using TanStack Router.

---

## 1. File-Based Routing Structure

The application uses TanStack Router. Route definitions are placed inside `renderer/src/routes/`. The directory maps directly to the URL structure:

* **Root Route**: `renderer/src/routes/__root.tsx` (Contains global wrappers, e.g. `<Outlet />` and `<Toaster />`).
* **Authentication**: `renderer/src/routes/login.lazy.tsx` (Lazy loaded login page).
* **Main Dashboard Layout**: `renderer/src/routes/dashboard.tsx` (Contains the layout wrapper, sidebar, and `<Outlet />`).
* **Dashboard Sub-pages**: File names follow a dot-separated structure under `dashboard`:
  * `dashboard.index.tsx` maps to `/dashboard`
  * `dashboard.orders.tsx` maps to `/dashboard/orders`
  * `dashboard.clients.tsx` maps to `/dashboard/clients`

---

## 2. Defining Routes and Layouts

### A. Creating a Sub-route Page (e.g., `dashboard.orders.tsx`)
Sub-routes are created using `createFileRoute`. They render within the parent `/dashboard` outlet:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/orders')({
  component: OrdersPageComponent,
})

function OrdersPageComponent() {
  return <div>Orders Management</div>
}
```

### B. Routing Compilation
When adding, renaming, or removing routes, Vite automatically regenerates the route tree file [routeTree.gen.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/routeTree.gen.ts). If automatic compilation is not running, ensure `npm run dev` is active.

---

## 3. Route Protection & Authorization

Route protection is implemented using the `beforeLoad` hook on routes. For example, in [dashboard.tsx](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/routes/dashboard.tsx):

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { authService } from '@/features/auth/AuthService'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    // Check if the user is authenticated with Electron Main
    const isAuthenticated = await authService.checkAuthStatus()
    
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthenticatedLayout,
})
```

---

## 4. Sidebar Navigation Links

Navigation links are controlled in [Sidebar.tsx](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/components/layout/Sidebar.tsx). 

To add or modify sidebar paths:
1. Append an item to the `menuItems` array:
   ```typescript
   const menuItems: MenuItem[] = [
     {
       id: 'bitacora',
       label: 'Bitácora',
       icon: Printer, // lucide-react icon
       path: '/dashboard/print-logs'
     }
   ]
   ```
2. Wrap or filter item renders based on permission hooks:
   ```tsx
   if (item.id === 'print-logs' && !canAccess('Ver Bitacora de Impresion')) {
     return null
   }
   ```
3. Use the `<Link>` component from `@tanstack/react-router` for single-page app navigation:
   ```tsx
   <Link to={item.path} activeProps={{ className: 'bg-blue-600' }}>
     <Icon />
     <span>{item.label}</span>
   </Link>
   ```
