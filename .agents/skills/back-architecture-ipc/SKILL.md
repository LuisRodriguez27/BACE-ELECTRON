---
name: architecture-ipc
description: "Triggers when managing communication between Frontend and Backend, Preload scripts, global window.api types, IPC Handlers, or data serialization across processes."
---

# Architecture and IPC Communication (Frontend-Backend)

This skill explains how to structure two-way communication between the React/Vite frontend (renderer process) and the Electron backend (main process) using global types, preload scripts, and IPC handlers.

---

## 1. Frontend-Backend Communication Flow

Communication follows a strict layered, one-way flow to ensure security and type safety:

```mermaid
sequenceDiagram
    participant Frontend as Renderer (React / Vite)
    participant Preload as Preload (ContextBridge)
    participant IPC as IPC Handlers (Main Process)
    participant Service as Service Layer

    Frontend->>Preload: window.api.getExpenses(page, limit)
    Note over Preload: Validate types / serialize payloads
    Preload->>IPC: ipcRenderer.invoke('expenses:getAll', page, limit)
    Note over IPC: Registered via ipcMain.handle
    IPC->>Service: expensesService.getAll(page, limit)
    Service-->>IPC: Returns a plain object (.toPlainObject())
    IPC-->>Preload: Send response back
    Preload-->>Frontend: Resolves the typed Promise
```

---

## 2. Preload Layer (`electron/preload.ts`)

The preload script [preload.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/preload.ts) acts as a secure bridge between the UI renderer process (running in a sandboxed environment) and the main Electron process.

It uses `contextBridge.exposeInMainWorld` to expose secure functions under `window.api`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Example: Retrieve paginated expenses
  getExpenses: (page: number, limit: number): Promise<unknown> =>
    ipcRenderer.invoke('expenses:getAll', page, limit),

  // Example: Create a new expense
  createExpense: (data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('expenses:create', data),
});
```

* **Rule**: Never expose the raw `ipcRenderer` object directly to the frontend. Only expose wrapper functions that invoke pre-defined IPC channels.

---

## 3. Global Frontend Types (`renderer/src/types/global.d.ts`)

For TypeScript to recognize methods on `window.api` in the frontend, declare them in the global types declaration file [global.d.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/types/global.d.ts):

```typescript
import type { Expense, CreateExpenseForm } from "../features/cashSession/types";

declare global {
  interface Window {
    api: {
      getExpenses: (page: number, limit: number) => Promise<{
        data: Expense[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>;
      createExpense: (data: CreateExpenseForm) => Promise<Expense>;
    };
  }
}

export { };
```

---

## 4. Main Process IPC Handlers

IPC channels are handled in the main process using `ipcMain.handle`.

### A. IPC Module File (e.g., `electron/ipc/expensesIpc.ts`)
Each module defines its listeners in its own IPC file inside `electron/ipc/`:

```typescript
import { ipcMain } from 'electron';
import expensesService from '../services/expensesService';
import type { CreateExpenseData } from '../types/expense';

export function registerExpensesIpc(): void {
  ipcMain.handle('expenses:getAll', async (_event, page: number, limit: number) => 
    await expensesService.getAll(page, limit)
  );

  ipcMain.handle('expenses:create', async (_event, data: CreateExpenseData) => 
    await expensesService.create(data)
  );
}
```

### B. Central Registration (`electron/ipc/index.ts`)
All module handlers are imported and invoked within the main registration function in [ipc/index.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/ipc/index.ts):

```typescript
import { registerExpensesIpc } from './expensesIpc';

export function registerIpcHandlers(): void {
  // ...other handlers
  registerExpensesIpc();
}
```

This main entry is executed inside `app.whenReady()` in [electron/index.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/index.ts).

---

## 5. Structured Cloning for IPC
Because Electron IPC data crosses process boundaries:
1. **Class instances cannot be transmitted directly** (e.g. methods and getters are stripped).
2. The Service layer must convert complex domain models to plain JavaScript objects using `.toPlainObject()` before returning them to the IPC layer.
3. Unsupported JavaScript types (such as `BigInt`, symbols, or functions) are not allowed in IPC payloads.
