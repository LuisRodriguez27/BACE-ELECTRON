---
name: state-auth
description: "Triggers when interacting with Zustand store, checking user permissions in the frontend, or handling global state (theme, auth, sidebar)."
---

# State Management & Permissions Hook

This skill explains how global state is managed on the frontend using **Zustand** stores, and how route-level and component-level permissions are validated using custom React hooks.

---

## 1. State Management with Zustand (`renderer/src/store/`)

Global state is split into specialized stores under `renderer/src/store/`:

### A. Authentication Store (`store/auth.ts`)
Tracks the current authenticated user, their assigned permission names, loading indicators, and active business config.
* **Store Access Hook**: [auth.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/store/auth.ts)
* **Actions**:
  * `setUser(user)`: Caches active user credentials.
  * `setUserPermissions(permissions)`: Stores active user permissions string array (e.g. `['Crear Cliente', 'Ver Caja']`).
  * `hasPermission(permission)`: Checks if the string permission matches items in the array.
  * `reset()`: Resets authentication data back to null on log out.

### B. UI Stores
* **Sidebar Store** (`store/sidebar.ts`): Manages the collapsible navigation panel expanded state (`isExpanded`, `toggleSidebar()`).
* **Theme Store** (`store/theme.ts`): Handles dark/light theme state (`theme`, `toggleTheme()`).

---

## 2. Component and Action Permissions (`usePermissions` Hook)

To conditionalize elements in React views (like showing or hiding a button) or block specific actions (like form submissions), import the `usePermissions` hook:
* **File Location**: [use-permissions.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/hooks/use-permissions.ts)

### Methods returned by `usePermissions()`:
1. **`canAccess(permissionName)`**: Returns a boolean indicating if the user has the permission. No side effects. Use this for conditional rendering:
   ```tsx
   import { usePermissions } from '@/hooks/use-permissions'
   
   function ClientView() {
     const { canAccess } = usePermissions()
     
     return (
       <div>
         <h1>Clients List</h1>
         {canAccess('Crear Cliente') && (
           <button>Create New Client</button>
         )}
       </div>
     )
   }
   ```
2. **`checkPermission(permissionName, showAlert = true)`**: Validates the permission. If missing and `showAlert` is true, triggers a red error toast notification in the UI (`toast.error('No tienes permiso...')`) and returns `false`. Use this to block action executors:
   ```tsx
   const { checkPermission } = usePermissions()
   
   const handleCreate = () => {
     // Blocks execution and displays a toast message if unauthorized
     if (!checkPermission('Crear Cliente')) return
     
     // Proceed to execute API service call
     ClientApiService.create(formData)
   }
   ```

---

## 3. Syncing with Preload/Backend API
Authentication changes must sync with Electron Main:
1. When calling `authService.login()` or checking `checkAuthStatus()`, the service executes the backend `window.api.login()` / `window.api.getUserWithPermissions()`.
2. Upon receiving the payload, the service populates the Zustand store with `useAuthStore.getState().setUser(user)` and `useAuthStore.getState().setUserPermissions(permissions)`.
