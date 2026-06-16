# Guía de Migración JS → TypeScript: BACE-ELECTRON Backend

> **Principio rector:** Migración incremental y segura. En cada fase, la aplicación debe arrancar y funcionar correctamente antes de continuar con la siguiente.
>
> **Estrategia de respaldo:** En lugar de eliminar los archivos `.js` originales, se renombrarán a `.js.bak` para tenerlos como referencia lado a lado. Al finalizar toda la migración, se eliminan con un solo comando.

---

## Índice de Fases

| Fase | Nombre | Archivos Involucrados | Riesgo |
|:---:|:---|:---|:---:|
| [Fase 1](#fase-1) | Infraestructura y Build | `tsconfig.json`, `package.json` | 🟡 Medio |
| [Fase 2](#fase-2) | Tipos Compartidos | `/electron/types/` (nuevo) | 🟢 Bajo |
| [Fase 3](#fase-3) | Base de Datos | `db.js`, `migrations.js` | 🔴 Alto |
| [Fase 4](#fase-4) | Modelos del Dominio | `electron/domain/*.js` (18 archivos) | 🟢 Bajo |
| [Fase 5](#fase-5) | Repositorios | `electron/repositories/*.js` (16 archivos) | 🟡 Medio |
| [Fase 6](#fase-6) | Servicios | `electron/services/*.js` (17 archivos) | 🟡 Medio |
| [Fase 7](#fase-7) | Preload | `electron/preload.js` | 🟢 Bajo |
| [Fase 8](#fase-8) | Punto de Entrada | `electron/index.js` | 🔴 Alto |
| [Fase 9](#fase-9) | Limpieza Final | Todos los `.js.bak`, activar `strict: true` total | 🟢 Bajo |

---

## Prerequisitos

Antes de comenzar, verifica que estás en la rama correcta de Git:

```bash
git checkout -b feat/typescript-migration
git status  # Debe estar limpio
```

---

<a name="fase-1"></a>
## Fase 1: Infraestructura y Build

**Objetivo:** Configurar el compilador TypeScript y hacer que la app arranque desde `dist-electron/` sin cambiar ni una línea de código de negocio.

### Paso 1.1 — Instalar dependencias de TypeScript

```bash
pnpm add -D typescript @types/node @types/pg @types/bcryptjs @types/fs-extra @types/mime-types @types/uuid -w
```

Verifica la instalación:
```bash
pnpm exec tsc --version
# Debe mostrar: Version 5.x.x
```

### Paso 1.2 — Crear `tsconfig.json` en la raíz

Crea el archivo `tsconfig.json` en `c:\Users\Luis\Documents\PROJECTS\BACE-ELECTRON\tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist-electron",
    "rootDir": "./electron",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["electron/**/*"],
  "exclude": ["node_modules", "renderer/**/*", "dist/**/*", "dist-electron/**/*"]
}
```

> **Nota:** `checkJs: false` es intencional. Evita que TypeScript valide los archivos `.js` que aún no han sido migrados, permitiendo compilar el proyecto completo desde el primer día.

### Paso 1.3 — Modificar `package.json`

Edita `package.json` aplicando exactamente estos cambios:

```diff
- "main": "electron/index.js",
+ "main": "dist-electron/index.js",

  "scripts": {
    "postinstall": "",
-   "dev:electron": "electron ./electron --no-sandbox",
+   "build:electron": "tsc",
+   "watch:electron": "tsc -w",
+   "dev:electron": "electron ./dist-electron --no-sandbox",
-   "dev": "concurrently -k --success first \"pnpm run dev:electron\" \"cd renderer && pnpm run dev\"",
+   "dev": "concurrently -k --success first \"tsc && tsc -w\" \"pnpm run dev:electron\" \"cd renderer && pnpm run dev\"",
-   "build": "cd renderer && pnpm run build",
+   "build": "tsc && cd renderer && pnpm run build",
    "dist": "pnpm run build && electron-builder",
    "dist:win": "pnpm run build && electron-builder --win",
    "dist:git": "pnpm run build && electron-builder --win -p always"
  },
```

Y dentro de la sección `"build"` de `electron-builder`:

```diff
  "files": [
-   "electron/**/*",
+   "dist-electron/**/*",
    "renderer/dist/**/*",
    "node_modules/**/*",
    ".env",
    "package.json"
  ],
```

### Paso 1.4 — Primera compilación de prueba

```bash
pnpm exec tsc
```

Esto compilará todos los archivos `.js` de `electron/` a `dist-electron/` copiándolos como JS (porque `allowJs: true`). Deberías ver la carpeta `dist-electron/` generarse con la misma estructura que `electron/`.

### Paso 1.5 — Verificar que la app arranca

```bash
pnpm run dev:electron
```

La aplicación debe arrancar exactamente igual que antes. Si funciona, la Fase 1 está completa.

> ✅ **Checkpoint:** La app inicia y funciona desde `dist-electron/`. Haz commit: `git commit -m "feat: add TypeScript infrastructure and build pipeline"`

---

<a name="fase-2"></a>
## Fase 2: Tipos Compartidos (`/electron/types/`)

**Objetivo:** Crear los tipos base del dominio que serán reutilizados por todas las capas (repositorios, servicios, modelos). Es el cimiento del tipado.

### Paso 2.1 — Crear la carpeta de tipos

```bash
mkdir electron\types
```

### Paso 2.2 — Crear `electron/types/db.ts`

Este archivo define la interfaz del objeto `db` que exporta `db.js`:

```typescript
import { PoolClient } from 'pg';

export interface DbExecuteResult {
  changes: number | null;
  lastInsertRowid: number | null;
}

export interface Db {
  getOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  getAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<DbExecuteResult>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: (...args: unknown[]) => Promise<T>): (...args: unknown[]) => Promise<T>;
}
```

### Paso 2.3 — Crear `electron/types/domain.ts`

Define los tipos de datos crudos de las filas de la base de datos (lo que devuelve PG antes de instanciar el objeto de dominio):

```typescript
// --- Tipos de estado y enums ---

export type OrderStatus = 'Revision' | 'Diseño' | 'Produccion' | 'Entrega' | 'Completado' | 'Cancelado';
export type OrderResponsable = 'Mostrador' | 'Maquila';
export type CashSessionStatus = 'open' | 'closed';
export type PrintLogResponsable = 'most' | 'maq';
export type PrintLogStatus = 'Pendiente' | 'En Proceso' | 'Realizado';
export type SupplierOrderStatus = 'pendiente' | 'pagado' | 'cancelado';

// --- Tipos de filas de DB (Row types) ---

export interface UserRow {
  id: number;
  username: string;
  password: string;
  active: boolean;
}

export interface PermissionRow {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

export interface ClientRow {
  id: number;
  name: string;
  phone: string | null;
  color: string | null;
  active: boolean;
}

export interface ProductRow {
  id: number;
  name: string;
  description: string | null;
  price: number;
  promo_price: number | null;
  discount_price: number | null;
  serial_number: string | null;
  images: string | null;
  active: boolean;
}

export interface OrderRow {
  id: number;
  client_id: number;
  user_id: number;
  edited_by: number | null;
  date: string;
  estimated_delivery_date: string | null;
  status: OrderStatus;
  responsable: OrderResponsable;
  total: number;
  notes: string | null;
  description: string | null;
  active: boolean;
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  user_username: string | null;
  edited_by_username: string | null;
}

export interface OrderProductRow {
  id: number;
  order_id: number;
  product_id: number | null;
  template_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_delivered: boolean;
  is_paid: boolean;
  product_name: string | null;
  serial_number: string | null;
  product_price: number | null;
  product_description: string | null;
}

export interface PaymentRow {
  id: number;
  order_id: number | null;
  client_id: number | null;
  user_id: number;
  amount: number;
  date: string;
  method: string;
  info: string | null;
  phone: string | null;
  client_name: string | null;
  cash_session_id: number | null;
}

export interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
}
```

### Paso 2.4 — Crear `electron/types/migrations.ts`

```typescript
import { PoolClient } from 'pg';

export interface Migration {
  version: number;
  name: string;
  /** Si está presente, detecta si la migración ya fue aplicada en una BD pre-versionada. */
  isApplied?: (client: PoolClient) => Promise<boolean>;
  up: (client: PoolClient) => Promise<void>;
}
```

### Paso 2.5 — Verificar que compila sin errores

```bash
pnpm exec tsc --noEmit
```

No debe haber errores. Los archivos `.ts` nuevos en `types/` son solo declaraciones de tipos, sin lógica.

> ✅ **Checkpoint:** Tipos base creados. Haz commit: `git commit -m "feat: add shared TypeScript type definitions"`

---

<a name="fase-3"></a>
## Fase 3: Base de Datos (`db.ts` y `migrations.ts`)

**Objetivo:** Migrar los dos archivos más complejos y críticos del backend. Todo el resto del código depende de ellos.

> ⚠️ **Importante:** Esta es la fase de mayor riesgo. Sigue exactamente el proceso de respaldo con `.js.bak`.

### Paso 3.1 — Migrar `db.js`

**3.1.a** — Renombrar el original como respaldo:
```bash
rename electron\db.js electron\db.js.bak
```

**3.1.b** — Crear `electron/db.ts` con el siguiente contenido:

```typescript
import { Pool, PoolClient, types } from 'pg';
import { AsyncLocalStorage } from 'async_hooks';
import * as path from 'path';
import { app, dialog } from 'electron';
import * as fs from 'fs';
import { runMigrations } from './migrations';
import { Db, DbExecuteResult } from './types/db';

const schemaTables: string = require('./schemaTables');
const schemaIndexes: string = require('./schemaIndexes');

// Forzar que los campos DECIMAL (OID 1700), float4 (700) y float8 (701) devuelvan Number
// ADVERTENCIA: Usar parseFloat con DECIMAL puede causar pérdida de precisión en centavos.
types.setTypeParser(1700, (val: string) => parseFloat(val));
types.setTypeParser(700,  (val: string) => parseFloat(val));
types.setTypeParser(701,  (val: string) => parseFloat(val));

// Cargar .env desde la raíz del proyecto (un nivel arriba de dist-electron/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isDev = !app.isPackaged;

const pool = new Pool({
  user:     isDev ? process.env.DEV_DB_USER     : process.env.PROD_DB_USER,
  host:     isDev ? process.env.DEV_DB_HOST     : process.env.PROD_DB_HOST,
  database: isDev ? process.env.DEV_DB_NAME     : process.env.PROD_DB_NAME,
  password: isDev ? process.env.DEV_DB_PASSWORD : process.env.PROD_DB_PASSWORD,
  port:     parseInt((isDev ? process.env.DEV_DB_PORT : process.env.PROD_DB_PORT) ?? '5432', 10),
});

const asyncLocalStorage = new AsyncLocalStorage<PoolClient>();

const db: Db = {
  async getOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query<T>(sql, params);
      return result.rows[0] ?? null;
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', sql, '\nParams:', params);
      throw e;
    }
  },

  async getAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query<T>(sql, params);
      return result.rows;
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', sql, '\nParams:', params);
      throw e;
    }
  },

  async execute(sql: string, params: unknown[] = []): Promise<DbExecuteResult> {
    let pgSql = sql;

    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const client = asyncLocalStorage.getStore() ?? pool;
    try {
      const result = await client.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
      };
    } catch (e) {
      const err = e as Error;
      console.error('Database Error:', err.message, '\nQuery:', pgSql, '\nParams:', params);
      throw e;
    }
  },

  transaction<T>(fn: (...args: unknown[]) => Promise<T>) {
    return async (...args: unknown[]): Promise<T> => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await asyncLocalStorage.run(client, () => fn(...args));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction Failed, rolling back:', err);
        throw err;
      } finally {
        client.release();
      }
    };
  },

  async exec(sql: string): Promise<unknown> {
    const client = asyncLocalStorage.getStore() ?? pool;
    return await client.query(sql);
  },
};

// SEPARADO de la exportación para evitar auto-ejecución al importar en tests o herramientas.
export async function initDb(): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query(schemaTables);
    await runMigrations(db, client);
    await client.query(schemaIndexes);
    console.log('✅ Base de datos PG Inicializada');
  } catch (e) {
    console.error('❌ Error inicializando Postgres DB:', e);
  } finally {
    if (client) client.release();
  }
}

export default db;
// Compatibilidad CommonJS para los módulos que aún usen require('./db')
module.exports = db;
module.exports.initDb = initDb;
```

### Paso 3.2 — Migrar `migrations.js`

**3.2.a** — Renombrar el original:
```bash
rename electron\migrations.js electron\migrations.js.bak
```

**3.2.b** — Crear `electron/migrations.ts`. El contenido es idéntico al `.js.bak`, solo se agregan las importaciones y tipos al inicio:

```typescript
import { PoolClient } from 'pg';
import { Db } from './types/db';
import { Migration } from './types/migrations';

// Mover el require inline de bcryptjs al nivel del módulo
import * as bcryptjs from 'bcryptjs';

const MIGRATIONS: Migration[] = [

  // v1: Seed inicial — usuario admin + todos los permisos base
  {
    version: 1,
    name: 'initial_seed',
    up: async (client: PoolClient) => {
      const hash = bcryptjs.hashSync('admin123', 10);

      const { rows: [admin] } = await client.query<{ id: number }>(
        `INSERT INTO users (username, password, active) VALUES ($1, $2, true) RETURNING id`,
        ['admin', hash]
      );

      // ... (resto igual que en migrations.js.bak, copiado literalmente)
      // Solo cambia: bcrypt.hashSync -> bcryptjs.hashSync (ya importado arriba)
      // Y los tipos de los callbacks: async (client) -> async (client: PoolClient)
    }
  },

  // v2 ... v27: Copiar el resto de migraciones desde migrations.js.bak
  // Solo agregar `: PoolClient` al parámetro `client` de cada función `up` e `isApplied`
  
];

// RUNNER PRINCIPAL
export async function runMigrations(db: Db, client: PoolClient): Promise<void> {
  // Copiar el cuerpo completo de runMigrations desde migrations.js.bak
  // No hay cambios de lógica, solo el tipo del parámetro `client: PoolClient`
}
```

> **Nota sobre migrations.ts:** El cuerpo de cada migración (el SQL) se copia literalmente desde `migrations.js.bak`. Solo hay dos tipos de cambios:
> 1. Agregar `: PoolClient` como tipo del parámetro `client` en cada función `up` e `isApplied`.
> 2. Cambiar `require('bcryptjs')` inline (en v1) por el `import` al inicio del archivo.

### Paso 3.3 — Verificar compilación y arranque

```bash
pnpm exec tsc --noEmit
# Sin errores

pnpm run dev:electron
# La app debe arrancar, conectarse a la DB y aplicar migraciones
```

> ✅ **Checkpoint:** DB y migraciones en TypeScript. Haz commit: `git commit -m "feat(ts): migrate db.js and migrations.js to TypeScript"`

---

<a name="fase-4"></a>
## Fase 4: Modelos del Dominio (`electron/domain/`)

**Objetivo:** Migrar los 18 modelos de clase ES6 a TypeScript usando los tipos definidos en la Fase 2.

**Complejidad: Baja** — El patrón es idéntico para todos los archivos.

### Paso 4.1 — Proceso por archivo (repetir para los 18 archivos)

El proceso para cada archivo en `electron/domain/` es:

```bash
# Ejemplo con order.js:
rename electron\domain\order.js electron\domain\order.js.bak
# Luego crear electron/domain/order.ts
```

### Paso 4.2 — Patrón de migración para clases de dominio

Tomar `order.js.bak` como referencia. El cambio es:

```typescript
// ANTES (order.js):
class Order {
  constructor({ id, client_id, status, ... }) {
    this.id = id;
    ...
  }
}

// DESPUÉS (order.ts):
import { OrderRow, OrderProductRow, OrderStatus, OrderResponsable } from '../types/domain';

class Order {
  id: number;
  client_id: number;
  status: OrderStatus;
  // ... declarar todas las propiedades aquí

  constructor(data: OrderRow & { orderProducts?: OrderProductRow[] }) {
    this.id = data.id;
    this.client_id = data.client_id;
    // ...
  }

  // Los static fields se convierten a enums o const:
  static readonly VALID_STATUSES: OrderStatus[] = ['Revision', 'Diseño', 'Produccion', 'Entrega', 'Completado', 'Cancelado'];
  static readonly STATUS = {
    REVISION: 'Revision' as const,
    DISENO: 'Diseño' as const,
    // ...
  };

  toPlainObject(): OrderRow & { client: ReturnType<typeof this.getClient>, ... } {
    return { ... };
  }
}

module.exports = Order;
```

### Paso 4.3 — Lista de archivos en orden sugerido

Migrar primero los más simples para ganar confianza:

1. `user.js` — Muy simple, pocas propiedades
2. `permission.js`
3. `client.js`
4. `product.js`
5. `productTemplate.js`
6. `simpleOrder.js`
7. `simpleOrderPayment.js`
8. `supplier.js`
9. `supplierOrder.js`
10. `supplierOrderItem.js`
11. `expenses.js`
12. `cashSession.js`
13. `payments.js`
14. `printLog.js`
15. `similarProductNames.js`
16. `budget.js`
17. `auth.js` — El de sesión, puede ser complejo
18. `order.js` — El más complejo, dejarlo al final

### Paso 4.4 — Verificar después de cada archivo

```bash
pnpm exec tsc --noEmit
# Sin errores nuevos después de cada migración
```

> ✅ **Checkpoint:** Los 18 modelos migrados. Haz commit: `git commit -m "feat(ts): migrate all domain models to TypeScript"`

---

<a name="fase-5"></a>
## Fase 5: Repositorios (`electron/repositories/`)

**Objetivo:** Migrar los 16 repositorios. El patrón principal es tipar las filas que devuelve PostgreSQL usando los `Row` types de `domain.ts`.

**Complejidad: Media** — Las queries son literales de string; el reto es tipar correctamente los retornos.

### Paso 5.1 — Proceso por archivo (repetir para los 16 archivos)

```bash
# Ejemplo:
rename electron\repositories\orderRepository.js electron\repositories\orderRepository.js.bak
# Crear electron/repositories/orderRepository.ts
```

### Paso 5.2 — Patrón de migración para repositorios

```typescript
// ANTES (orderRepository.js):
const db = require('../db');
const Order = require('../domain/order');

class OrderRepository {
  async findById(id) {
    const orderData = await db.getOne(`SELECT ...`, [id]);
    if (!orderData) return null;
    return new Order(orderData);
  }
}

// DESPUÉS (orderRepository.ts):
import db from '../db';
import Order from '../domain/order';
import { OrderRow, OrderProductRow } from '../types/domain';

class OrderRepository {
  async findById(id: number): Promise<Order | null> {
    const orderData = await db.getOne<OrderRow>(`SELECT ...`, [id]);
    if (!orderData) return null;
    const orderProducts = await this.getOrderProducts(id);
    return new Order({ ...orderData, orderProducts });
  }

  async getOrderProducts(orderId: number): Promise<OrderProductRow[]> {
    return db.getAll<OrderProductRow>(`SELECT ...`, [orderId]);
  }
}

module.exports = new OrderRepository();
```

### Paso 5.3 — Caso especial: `update()` con SET dinámico

El patrón de SET dinámico en `orderRepository.js` requiere un tipo explícito:

```typescript
// Tipo para los campos actualizables de una orden
type OrderUpdateFields = Partial<{
  client_id: number;
  date: string;
  estimated_delivery_date: string | null;
  status: OrderStatus;
  responsable: OrderResponsable;
  notes: string | null;
  description: string | null;
  edited_by: number | null;
}>;

async update(id: number, orderData: OrderUpdateFields & { items?: OrderItemInput[] }): Promise<Order | null> {
  const fieldsToUpdate: OrderUpdateFields = {};
  // ... resto igual
}
```

### Paso 5.4 — Lista de archivos en orden sugerido

1. `authRepository.js` — Simple, maneja sesión en memoria
2. `userRepository.js`
3. `permissionRepository.js`
4. `clientRepository.js`
5. `supplierRepository.js`
6. `productRepository.js`
7. `productTemplateRepository.js`
8. `simpleOrderRepository.js`
9. `expensesRepository.js`
10. `cashSessionRepository.js`
11. `paymentsRepository.js`
12. `supplierOrderRepository.js`
13. `printLogRepository.js`
14. `statsRepository.js` — Retornos complejos de agregaciones SQL
15. `budgetRepository.js` — Grande, similar a orderRepository
16. `orderRepository.js` — El más complejo (428 líneas), dejarlo al final

> ✅ **Checkpoint:** Los 16 repositorios migrados. Haz commit: `git commit -m "feat(ts): migrate all repositories to TypeScript"`

---

<a name="fase-6"></a>
## Fase 6: Servicios (`electron/services/`)

**Objetivo:** Migrar los 17 servicios. Son los más fáciles de tipar porque sus tipos de entrada y salida ya están parcialmente definidos en `global.d.ts` del frontend.

**Complejidad: Baja-Media** — La lógica de negocio es pura; el reto es tipar los parámetros de entrada (`data`) que llegan desde el IPC.

### Paso 6.1 — Referencia clave: el contrato del frontend

Antes de migrar cada servicio, abre el archivo del frontend correspondiente:
`renderer/src/types/global.d.ts`

Los tipos de parámetros y retornos de los métodos de `window.api` son exactamente lo que debe recibir y devolver cada servicio.

### Paso 6.2 — Patrón de migración para servicios

```typescript
// ANTES (orderService.js):
class OrderService {
  async createOrder(orderData) {
    const { client_id, user_id, items, ... } = orderData;
    ...
  }
}

// DESPUÉS (orderService.ts):
import orderRepository from '../repositories/orderRepository';
import Order from '../domain/order';
import { OrderStatus, OrderResponsable } from '../types/domain';

interface CreateOrderInput {
  client_id: number | string;
  user_id: number | string;
  date: string;
  estimated_delivery_date?: string | null;
  status?: OrderStatus;
  responsable?: OrderResponsable;
  notes?: string | null;
  description?: string | null;
  items?: OrderItemInput[];
  products?: LegacyProductInput[]; // Compatibilidad legacy
}

interface OrderItemInput {
  product_id?: number | null;
  template_id?: number | null;
  quantity: number | string;
  unit_price: number | string;
  is_delivered?: boolean | string;
  is_paid?: boolean | string;
}

class OrderService {
  async createOrder(orderData: CreateOrderInput): Promise<ReturnType<Order['toPlainObject']>> {
    ...
  }
}
```

### Paso 6.3 — Manejo de `catch (error)` con `strict: true`

Con `strict: true`, TypeScript requiere que el error del catch sea tipado. Aplica este patrón en **todos** los bloques catch:

```typescript
// ANTES:
} catch (error) {
  console.error('Error:', error);
  throw error;
}

// DESPUÉS:
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('Error:', err.message);
  throw err;
}
```

### Paso 6.4 — Caso especial: `imageService.ts`

El `imageService.js` usa un `require('electron')` lazy dentro de `getBasePath()`. Mantener el patrón pero con tipo:

```typescript
getBasePath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require('electron') as typeof import('electron');
  const isDev = !app.isPackaged;
  // ...
}
```

### Paso 6.5 — Lista de archivos en orden sugerido

1. `statsService.js`
2. `userService.js`
3. `authService.js`
4. `permissionService.js`
5. `clientService.js`
6. `supplierService.js`
7. `productService.js`
8. `productTemplateService.js`
9. `imageService.js`
10. `expensesService.js`
11. `cashSessionService.js`
12. `paymentsService.js`
13. `printLogService.js`
14. `simpleOrderService.js`
15. `supplierOrderService.js`
16. `budgetService.js`
17. `orderService.js` — El más complejo (487 líneas), al final

> ✅ **Checkpoint:** Los 17 servicios migrados. Haz commit: `git commit -m "feat(ts): migrate all services to TypeScript"`

---

<a name="fase-7"></a>
## Fase 7: Preload Script (`electron/preload.ts`)

**Objetivo:** Migrar el puente IPC. Es declarativo y de baja complejidad.

### Paso 7.1 — Renombrar y migrar

```bash
rename electron\preload.js electron\preload.js.bak
```

Crear `electron/preload.ts`. El cambio es solo agregar los tipos a los parámetros de cada función:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Usuarios
  getAllUsers: (): Promise<unknown> => ipcRenderer.invoke('users:getAll'),
  getUserById: (id: number): Promise<unknown> => ipcRenderer.invoke('users:getById', id),
  createUser: (data: unknown): Promise<unknown> => ipcRenderer.invoke('users:create', data),
  updateUser: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id: number): Promise<unknown> => ipcRenderer.invoke('users:delete', id),
  verifyPassword: (data: unknown): Promise<unknown> => ipcRenderer.invoke('users:verifyPassword', data),
  checkUsername: (username: string, excludeUserId?: number): Promise<boolean> =>
    ipcRenderer.invoke('users:checkUsername', username, excludeUserId),

  // ... (resto de los métodos con el mismo patrón de tipado)

  // updater (objeto anidado con callbacks)
  updater: {
    onUpdateAvailable: (callback: (info: { version: string }) => void): void => {
      ipcRenderer.on('updater:update-available', (_event, info) => callback(info));
    },
    onUpdateDownloaded: (callback: (data: { version: string; notes: string }) => void): void => {
      ipcRenderer.on('updater:update-downloaded', (_event, data) => callback(data));
    },
    removeAllListeners: (): void => {
      ipcRenderer.removeAllListeners('updater:update-available');
      ipcRenderer.removeAllListeners('updater:update-downloaded');
    },
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  },
});
```

> **Tip:** Para los tipos exactos de cada parámetro, consulta `renderer/src/types/global.d.ts`. Los tipos allí definidos son el contrato exacto.

### Paso 7.2 — Verificar

```bash
pnpm exec tsc --noEmit
pnpm run dev:electron
# La app debe funcionar con todos los canales IPC operativos
```

> ✅ **Checkpoint:** Preload migrado. Haz commit: `git commit -m "feat(ts): migrate preload.js to TypeScript"`

---

<a name="fase-8"></a>
## Fase 8: Punto de Entrada (`electron/index.ts`)

**Objetivo:** Migrar el archivo más complejo del proyecto. Es el último en migrarse para tener todas las dependencias tipadas disponibles.

> ⚠️ **Esta es la fase de mayor riesgo.** El auto-updater y el workaround de UAC son código de producción crítico. Copia el código con extremo cuidado.

### Paso 8.1 — Renombrar y crear

```bash
rename electron\index.js electron\index.js.bak
```

### Paso 8.2 — Estructura de `electron/index.ts`

Los cambios principales respecto al `.js.bak` son:

**1. Importaciones al top-level** (incluyendo `require` inline que había en el código):
```typescript
import { app, BrowserWindow, ipcMain, protocol, net, shell, Menu, clipboard } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import * as log from 'electron-log';
import * as http from 'http';

// Servicios
import userService from './services/userService';
// ... (resto de servicios)

// Inicializador de DB (ya NO se llama automáticamente)
import { initDb } from './db';
```

**2. Llamada explícita a `initDb()`** dentro de `app.whenReady()`:
```typescript
app.whenReady().then(async () => {
  // ← NUEVO: inicializar la DB explícitamente aquí
  await initDb();

  // ... registro de protocolo, createWindow(), etc.
});
```

**3. Tipos para variables mutables:**
```typescript
let whatsappWindow: BrowserWindow | null = null;
let isQuitting: boolean = false;
let downloadedUpdatePath: string | null = null;
```

**4. Tipos en los handlers de eventos:**
```typescript
// Context menu de WhatsApp
whatsappWindow.webContents.on('context-menu', (_event, params) => {
  // `params` ya tiene tipo ContextMenuParams de Electron
  const template: Electron.MenuItemConstructorOptions[] = [];
  ...
});
```

**5. Tipo en `parseReleaseNotes`:**
```typescript
function parseReleaseNotes(notes: string | { note?: string; notes?: string }[] | unknown): string {
  const fallback = 'Mejoras de rendimiento y correcciones de errores.';
  // ... resto igual
}
```

### Paso 8.3 — Verificar compilación

```bash
pnpm exec tsc --noEmit
# Sin errores
```

### Paso 8.4 — Prueba completa de la aplicación

```bash
pnpm run dev
# Arranca Vite + Electron juntos
```

Verificar manualmente:
- [ ] La app arranca y muestra la pantalla de login
- [ ] El login funciona
- [ ] Los datos de la BD se cargan correctamente
- [ ] Las imágenes se cargan con el protocolo `imagenes://`
- [ ] El botón de WhatsApp abre la ventana secundaria
- [ ] El auto-updater no genera errores en los logs

> ✅ **Checkpoint:** Toda la app migrada. Haz commit: `git commit -m "feat(ts): migrate index.js to TypeScript — migration complete"`

---

<a name="fase-9"></a>
## Fase 9: Limpieza Final

**Objetivo:** Eliminar los archivos `.js.bak`, activar validación estricta en JS, y preparar el proyecto para el despliegue al Cliente 1.

### Paso 9.1 — Verificación de build de producción

```bash
pnpm run build
# tsc + vite build — debe completarse sin errores
```

### Paso 9.2 — Eliminar archivos de respaldo

```bash
# Windows PowerShell
Get-ChildItem -Path electron -Recurse -Filter "*.js.bak" | Remove-Item -Force
```

### Paso 9.3 — Activar `checkJs: true` (opcional pero recomendado)

En `tsconfig.json`, cambia:
```diff
- "checkJs": false,
+ "checkJs": true,
```

Esto hará que TypeScript valide también cualquier archivo `.js` que quede. Si hay errores, corrígelos. Si todo está limpio, puedes cambiar a:
```diff
- "allowJs": true,
+ "allowJs": false,
```

Para bloquear completamente cualquier JS nuevo en el backend.

### Paso 9.4 — Agregar `dist-electron/` al `.gitignore`

```bash
echo. >> .gitignore
echo # TypeScript compiled output >> .gitignore
echo dist-electron/ >> .gitignore
```

### Paso 9.5 — Commit y tag de versión

```bash
git add .
git commit -m "chore: cleanup js.bak files and finalize TypeScript migration"
git tag -a v7.0.0-ts -m "TypeScript migration complete — ready for Client 1 deployment"
```

> ✅ **Checkpoint Final:** Migración completada. El proyecto está listo para hacer `pnpm run dist:git` y desplegar al Cliente 1.

---

## Resumen de Esfuerzo Estimado

| Fase | Archivos | Estimado |
|:---:|:---|:---:|
| 1 | Infraestructura | 1-2 horas |
| 2 | Tipos compartidos | 1-2 horas |
| 3 | DB + Migrations | 2-4 horas |
| 4 | Domain (18 archivos) | 3-5 horas |
| 5 | Repositories (16 archivos) | 4-6 horas |
| 6 | Services (17 archivos) | 4-6 horas |
| 7 | Preload | 1 hora |
| 8 | Index principal | 2-3 horas |
| 9 | Limpieza | 30 min |
| **Total** | **~72 archivos** | **~18-29 horas** |

---

## Comandos de Referencia Rápida

```bash
# Compilar una vez
pnpm exec tsc

# Compilar en modo observación (watch)
pnpm exec tsc -w

# Verificar tipos SIN generar archivos (el más útil durante la migración)
pnpm exec tsc --noEmit

# Iniciar la app en desarrollo (requiere haber compilado antes)
pnpm run dev:electron

# Iniciar todo (Vite + tsc + Electron)
pnpm run dev
```

---

## Próximos Pasos (Post-Migración)

Una vez desplegada la versión TypeScript al **Cliente 1** y confirmado que funciona en producción:

1. **Hacer fork del repositorio** para crear el proyecto del **Cliente 2**
2. En el fork, instalar `knex` + `better-sqlite3` + `electron-rebuild`
3. Crear `knexfile.ts` y migrar `db.ts` para usar Knex en lugar del pool directo de `pg`
4. Migrar los repositorios de SQL crudo a Knex Query Builder de forma progresiva

Ver el análisis completo en `js_to_ts_migration_analysis.md` para la estrategia detallada de Knex.
