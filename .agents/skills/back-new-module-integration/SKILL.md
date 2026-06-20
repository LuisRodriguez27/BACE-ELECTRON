---
name: new-module-integration
description: "Triggers when creating or integrating a new feature or module in the application, adding end-to-end endpoints from the DB up to the frontend API."
---

# Guide to Integrating a New Module

This skill outlines the standard pattern for adding a new module to the application backend, keeping declarations concise by referencing the existing implementation.

---

## 1. Directory Structure and Files to Create

When adding a new module (e.g., **`Bitacora`** / Logbook), create or modify the following files:

```text
electron/
 ├── types/bitacora.ts                        <-- Type definitions
 ├── domain/bitacora.ts                       <-- Domain model entity class (normalization)
 ├── repositories/bitacoraRepository.ts       <-- Data retrieval and SQL operations
 ├── services/bitacoraService.ts              <-- Business logic and validation
 ├── ipc/bitacoraIpc.ts                       <-- Electron ipcMain handlers
 ├── ipc/index.ts                             <-- [MODIFY] Register module IPC handlers
 └── preload.ts                               <-- [MODIFY] Expose handlers in contextBridge
renderer/src/types/global.d.ts                <-- [MODIFY] Extend global window.api types
```

---

## 2. Integration Recipe

### Step 1: Database Setup
* **Fresh setup**: Add the table definition inside [schemaTables.ts] and indices inside [schemaIndexes.ts].
* **Migration**: Append a migration object at the end of the `MIGRATIONS` array in [migrations.ts]:
  ```typescript
  await client.query(`
    CREATE TABLE IF NOT EXISTS bitacoras (
      id       SERIAL      PRIMARY KEY,
      user_id  INTEGER     NOT NULL REFERENCES users(id),
      accion   TEXT        NOT NULL,
      date     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  ```

### Step 2: Declare Types (`electron/types/bitacora.ts`)
```typescript
export interface BitacoraRow {
  id: number;
  user_id: number;
  accion: string;
  date: string;
}
export interface CreateBitacoraData {
  user_id: number;
  accion: string;
}
```

### Step 3: Domain Model Class (`electron/domain/bitacora.ts`)
Create a class wrapping the row object, exposing a `.toPlainObject()` method to allow IPC structured cloning:
```typescript
import type { BitacoraRow } from '../types/bitacora';

export default class Bitacora {
  id: number;
  user_id: number;
  accion: string;
  date: string;

  constructor({ id, user_id, accion, date }: BitacoraRow) {
    this.id = id;
    this.user_id = user_id;
    this.accion = accion;
    this.date = date;
  }

  toPlainObject() {
    return { id: this.id, user_id: this.user_id, accion: this.accion, date: this.date };
  }
}
```

### Step 4: Repository Class (`electron/repositories/bitacoraRepository.ts`)
Execute parameterized queries using `db` and map the database row to a domain model instance:
```typescript
import db from '../db';
import Bitacora from '../domain/bitacora';
import type { BitacoraRow, CreateBitacoraData } from '../types/bitacora';

class BitacoraRepository {
  async getById(id: number) {
    const row = await db.getOne<BitacoraRow>(`SELECT * FROM bitacoras WHERE id = $1`, [id]);
    return row ? new Bitacora(row) : null;
  }

  async create({ user_id, accion }: CreateBitacoraData) {
    const row = await db.getOne<{ id: number }>(
      `INSERT INTO bitacoras (user_id, accion) VALUES ($1, $2) RETURNING id`,
      [user_id, accion]
    );
    return this.getById(row!.id);
  }
}
export default new BitacoraRepository();
```

### Step 5: Service Layer (`electron/services/bitacoraService.ts`)
Coordinate logic and input validation:
```typescript
import bitacoraRepository from '../repositories/bitacoraRepository';
import type { CreateBitacoraData } from '../types/bitacora';

class BitacoraService {
  async create(data: CreateBitacoraData) {
    if (!data.accion?.trim()) throw new Error('Action details are required');
    const log = await bitacoraRepository.create(data);
    if (!log) throw new Error('Failed to create log entry');
    return log.toPlainObject();
  }
}
export default new BitacoraService();
```

### Step 6: IPC Handlers and Preload Script
1. Create the module's IPC handlers file (`electron/ipc/bitacoraIpc.ts`):
   ```typescript
   import { ipcMain } from 'electron';
   import bitacoraService from '../services/bitacoraService';

   export function registerBitacoraIpc(): void {
     ipcMain.handle('bitacoras:create', async (_event, data: any) => await bitacoraService.create(data));
   }
   ```
2. Import and invoke `registerBitacoraIpc()` in [ipc/index.ts].
3. Expose the function in [preload.ts]:
   ```typescript
   createBitacora: (data: unknown): Promise<unknown> => ipcRenderer.invoke('bitacoras:create', data)
   ```

### Step 7: Frontend Types Configuration (`renderer/src/types/global.d.ts`)
Extend the global declarations for `window.api`:
```typescript
createBitacora: (data: any) => Promise<any>;
```

---

## 3. Inferring Additional Endpoints (CRUD)
For standard operations such as paginated lists (`getAll`), searches (`search`), updates (`update`), or logical deletions (`delete`):
* Refer to the **Expenses** module as the project's standard reference implementation:
  * **Repository**: [expensesRepository.ts]
  * **Service**: [expensesService.ts]
  * **IPC**: [expensesIpc.ts]
* Replicate the patterns used there for paginating queries, counting total results, and compiling dynamic parameter lists for SQL update statements.
