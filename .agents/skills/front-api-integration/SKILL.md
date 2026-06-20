---
name: api-integration
description: "Triggers when creating or modifying frontend API services (wrapping window.api), handling queries/mutations, or using hook patterns for search/pagination."
---

# API Integration & Search Hook Patterns

This skill explains how frontend features invoke Electron main queries using stateless **ApiServices**, how React hooks coordinate asynchronous state operations (such as debouncing, pagination, and dropdown selection), and how backend IPC errors are processed and parsed.

---

## 1. ApiService Pattern (`renderer/src/features/`)

Frontend queries are isolated inside ApiService files located in each module's feature directory (e.g. [ClientApiService.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/features/clients/ClientApiService.ts)).

These services expose clean, promise-based wrappers mapping to `window.api` calls, separating database communication from UI component logic:

```typescript
import type { Client, CreateClientForm, EditClientForm } from "./types";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const ClientApiService = {
  findAll: async (): Promise<Client[]> => {
    return window.api.getAllClients();
  },

  findPaginated: async (page: number, limit: number, searchTerm = ''): Promise<PaginatedResponse<Client>> => {
    return window.api.getClientsPaginated(page, limit, searchTerm);
  },

  create: async (client: CreateClientForm): Promise<Client> => {
    return window.api.createClient(client);
  },
};
```

---

## 2. Advanced Search Hook Pattern (Debouncing & Dropdowns)

For complex actions (like autocomplete fields or searching lists), the application uses specialized custom React hooks (e.g., [useClientSearch.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/features/clients/hooks/useClientSearch.ts)).

### Key Mechanisms:
1. **Debounced Queries**: When typing in a search bar, a `useEffect` timer delays the ApiService execution to prevent excessive IPC/database operations:
   ```typescript
   useEffect(() => {
     if (!searchTerm) return;

     const timer = setTimeout(async () => {
       const response = await ClientApiService.findPaginated(1, 20, searchTerm);
       setResults(response.data);
     }, 300); // 300ms delay

     return () => clearTimeout(timer); // Reset timer if the user types another character
   }, [searchTerm]);
   ```
2. **Dropdown Out-of-bounds Click Closure**: Registers a listener on the document root to close dropdown lists when the user clicks elsewhere:
   ```typescript
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       const target = event.target as Element;
       const dropdown = document.getElementById('search-dropdown');
       const input = document.getElementById('search-input');

       if (dropdown && showDropdown && !dropdown.contains(target) && !input?.contains(target)) {
         setShowDropdown(false);
       }
     };

     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [showDropdown]);
   ```

---

## 3. IPC Error Parsing and Formatting

Because Electron IPC wraps backend exceptions inside channel invocation wrappers, direct error objects have messages matching:
`Error invoking remote method 'channel': Error: actual message`

To clean and display these errors in form fields or modals, the application uses formatting utilities defined in [errorHandling.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/utils/errorHandling.ts):

* **`extractErrorMessage(error)`**: Uses a regular expression to strip the Electron IPC wrapper and return the raw backend string message.
* **`getUserFriendlyErrorMessage(error)`**: Maps the clean backend error messages to user-friendly Spanish localization strings (e.g. mapping `'El username ya está en uso'` to `'Este nombre de usuario ya existe. Por favor, elige otro.'`).

### Example Usage:
```typescript
import { extractErrorMessage } from '@/utils/errorHandling';

try {
  await ClientApiService.create(formData);
} catch (err: any) {
  const cleanMsg = extractErrorMessage(err);
  setError(cleanMsg); // Ready to show in form warnings
}
```
