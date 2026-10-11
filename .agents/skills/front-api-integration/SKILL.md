---
name: api-integration
description: "Triggers when creating or modifying frontend API services (wrapping window.api), handling queries/mutations, or using hook patterns for search/pagination."
---

# API Integration & Search Hook Patterns

This skill explains how frontend features invoke Electron main queries using stateless **ApiServices**, how React hooks coordinate asynchronous state operations, and how date formatting and backend IPC errors are processed in the frontend.

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

---

## 3. Date, Time and Timezone Management (`dateUtils.ts`)

Since the backend is timezone-agnostic and stores timestamps strictly as UTC ISO strings, **the frontend is entirely responsible for date and time localized conversions**.

The helper [dateUtils.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/utils/dateUtils.ts) uses `dayjs` with the `utc` and `timezone` plugins set to `'America/Mexico_City'` (`MX_TZ`) to handle formatting:

### Common Operations:
* **Current Timestamp (UTC)**: Use `nowISO()` to get the current timestamp formatted strictly in ISO UTC (`Z`) to submit to the backend.
* **Form Display Localizer**: Use `formatDateMX(isoString, formatStr)` to parse an ISO UTC string from the backend and display it in Mexico City local time (e.g., `DD/MM/YYYY, h:mm A`).
* **DatePicker Defaults**: Use `todayDateInputMX()` to retrieve the current date formatted as `YYYY-MM-DD` in the Mexico City timezone.
* **Date-Only Parser (Preserves Day)**: Use `formatDateOnlyMX(isoString)` to format midnight-stored UTC dates without letting timezone subtraction shift the calendar day backwards.
* **Input-to-UTC Converters**: Use `startOfDayUTC(dateString)` and `endOfDayUTC(dateString)` to force a `YYYY-MM-DD` date picker value to a standard UTC midnight or final millisecond ISO string (e.g., `2025-10-15T00:00:00.000Z` or `2025-10-15T23:59:59.999Z`) before sending it to the database.
* **Preserve Register Time**: Use `preserveTimeOrStartOfDay(newDateInput, originalISO)` when editing records to prevent overwriting existing time-of-day information.

---

## 4. IPC Error Parsing and Formatting

Because Electron IPC wraps backend exceptions inside channel invocation wrappers, direct error objects have messages matching:
`Error invoking remote method 'channel': Error: actual message`

To clean and display these errors in form fields or modals, the application uses formatting utilities defined in [errorHandling.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/utils/errorHandling.ts):

* **`extractErrorMessage(error)`**: Uses a regular expression to strip the Electron IPC wrapper and return the raw backend string message.
* **`getUserFriendlyErrorMessage(error)`**: Maps the clean backend error messages to user-friendly Spanish localization strings.
