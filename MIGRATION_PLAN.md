# Plan de Migración: BACE-ELECTRON a Arquitectura Multi-Cliente

**Objetivo:** Migrar la aplicación BACE-ELECTRON desde una arquitectura monolítica (un solo cliente en producción) a un monorepo escalable multi-cliente. 
**Condiciones clave:** Reutilizar core, aislar bases de datos (Postgres/SQLite) mediante Drizzle ORM, soportar branding/UI independiente, mantener versionado y actualizaciones (S3/GitHub) aislados por cliente, y asegurar cero impacto en el cliente actual.

---

## FASE 0: Contexto y Arquitectura Actual vs. Destino
- **Actual:** Carpeta `electron/` (JavaScript, lógica acoplada) y `renderer/` (Vite + React + TS). Build monolítico.
- **Destino (Workspace):** Uso de `pnpm workspaces` para separar el código en módulos (`packages/`) consumibles por aplicaciones finales (`clients/`).

---

## FASE 1: Preparación técnica y Refactorización a TypeScript
Actualmente el `renderer` está en TypeScript, pero `electron` está en JavaScript vanilla. Para una arquitectura robusta, tipado estricto e inyección de dependencias, TypeScript en el backend es fundamental.

1. **Configuración Inicial TS para Electron:**
   - Instalar dependencias: `pnpm add -D typescript tsx @types/node @types/pg drizzle-kit`.
   - Instalar Drizzle y drivers: `pnpm add drizzle-orm pg better-sqlite3`.
   - Crear un `tsconfig.electron.json` en la carpeta `electron`.
2. **Migración Progresiva (Archivos JS a TS):**
   - Renombrar `electron/domain/*.js` a `*.ts` y tipar las entidades.
   - Renombrar `electron/repositories/*.js` a `*.ts`. Aquí se definen interfaces claras (ej. `IAuthRepository`, `IOrderRepository`).
   - Renombrar `electron/services/*.js` a `*.ts`.
   - Adaptar `preload.js` y `index.js` (punto de entrada) para ser compilados con `tsc` o `tsup` antes del empaquetado.
3. **Validación:**
   - Compilar y probar exhaustivamente el sistema actual tipado antes de mover ninguna carpeta.

---

## FASE 2: Reestructuración física a Monorepo Estricto
Vamos a usar la funcionalidad de `pnpm workspaces` que ya tienes habilitada, pero separando el núcleo («Core») de las implementaciones por cliente.

1. **Nueva Estructura de Carpetas:**
   ```text
   /packages
     /core-electron       (Lógica actual tipada en TS, interfaces, servicios)
     /core-renderer       (Componentes React actuales, utilidades comunes)
     /core-db             (Esquemas de Drizzle ORM y lógica de queries neutral)
   /clients
     /cliente-original    (El cliente actual en producción)
     /cliente-nuevo       (El próximo cliente)
   ```
2. **Desplazamiento del Cliente Actual:**
   - Todo el aspecto visual actual, logo, y configuraciones exclusivas se moverán a `/clients/cliente-original/renderer`.
   - El punto de entrada de Electron se moverá a `/clients/cliente-original/electron/index.ts`.
   - En los `package.json` de cada cliente, se usarán los sub-paquetes locales: `"dependencies": { "@bace/core-electron": "workspace:*", "@bace/core-renderer": "workspace:*" }`.
3. **Modificación del `pnpm-workspace.yaml`:**
   ```yaml
   packages:
     - 'packages/*'
     - 'clients/*'
   ```
4. **Scripts de Monorepo:**
   - Actualizar el `package.json` de la raíz para ejecutar comandos por cliente:
     `"dev:cliente-nuevo": "pnpm --filter cliente-nuevo run dev"`
     `"build:cliente-original": "pnpm --filter cliente-original run build"`

---

## FASE 3: Drizzle ORM como capa agnóstica de Base de Datos
Excelente decisión usar **Drizzle ORM**. Te permite definir los esquemas de tablas *una sola vez* y ejecutar queries tipadas de manera idéntica tanto en Postgres como en SQLite, evitando reescribir SQL crudo y reduciendo el riesgo de errores de sintaxis en dialectos diferentes.

1. **Esquema Único y Repositorios:**
   - En `/packages/core-db`, defines tus esquemas (ej. `users`, `orders`) usando Drizzle y creas los queries base.
   - En `/packages/core-electron`, los repositorios consumen la instancia de Drizzle ya configurada.
2. **Setup por Dialecto en el Cliente:**
   El driver se inyecta desde el entry point del cliente, pero la lógica del Core usa la misma API de Drizzle.
   En `/clients/cliente-nuevo/electron/index.ts` (Postgres):
   ```typescript
   import { BaceCore } from '@bace/core-electron';
   import { drizzle } from 'drizzle-orm/node-postgres';
   import { Pool } from 'pg';
   
   const db = drizzle(new Pool({ connectionString: process.env.DB_URL }));
   
   // El cliente define sus configuraciones y arranca la app de core
   BaceCore.start({
     db,
     features: ['BUDGETS', 'CASH_SESSION'] // Feature toggles
   });
   ```

---

## FASE 4: Frontend, Branding y Feature Toggles (Módulos Opcionales y Exclusivos)
El `core-renderer` actuará como una librería de componentes y rutas, no como un proyecto autoejecutable. Además, los componentes actuales deben modificarse para ser dinámicos y aceptar configuraciones de activación/desactivación.

1. **Refactor para Features Habilitables (Feature Toggles):**
   - **Frontend (Sidebar y Rutas):** Tus rutas de `TanStack Router` que actualmente son estáticas, deberán ser generadas dinámicamente o registradas condicionalmente a partir de la configuración del cliente (ej. `ClientConfig.features`). Si el cliente no tiene la feature "BUDGETS", la ruta `/dashboard/budgets` no se registra en su árbol de rutas (`routeTree`), y la opción no se pinta en el `Sidebar.tsx`.
   - **Backend (Electron IPC):** Al inicializar la app, el Core solo debe registrar los listeners `ipcMain.handle` correspondientes a los módulos activados en esa misma configuración.

2. **Creación de Features EXCLUSIVOS:**
   - Si un cliente pide un módulo que *solo él* usará, **Ese código NO debe tocar las carpetas `core-electron` ni `core-renderer`**.
   - **Frontend:** Creas las vistas y componentes dentro de `/clients/cliente-exclusivo/renderer/src/features/nuevo-modulo/` y agregas la ruta a la inicialización del `TanStack Router` específico de ese cliente.
   - **Backend:** Escribes la lógica en `/clients/cliente-exclusivo/electron/` y registras los IPC exclusvos antes de llamar al `BaceCore.start()`.
3. **Resolución por Alias (Vite) / Inyección de Vistas:**
   - En el `vite.config.ts` de cada cliente, se definen overrides.
   - Si un cliente necesita un `PrintPreviewModal.tsx` distinto, se sobreescribe en el alias de Vite referenciando el componente local de ese cliente sin tocar el core.
4. **Temas y Colores:**
   - Extraer todos los colores duros del `App.css`/`index.css` a Variables CSS (`--primary-color`).
   - Cada cliente tendrá un archivo `theme.css` inyectado por su `main.tsx`.
5. **Comunicación IPC (Inter-Process Communication):**
   - El `core-electron` expondrá los canales IPC globales (ej: `ipcMain.handle('get-orders', ...)`).
   - El archivo `preload.ts` mapeará estos métodos genéricos al objeto `window.api`.
   - Si un cliente requiere features exclusivos, registrará sus propios canales IPC en su entry point `/clients/su-nombre/electron/index.ts` y proveerá un `preload.js` extendido.

---

## FASE 5: Estrategia de Releases y CI/CD (CRÍTICO)

### El problema: GitHub Releases y Múltiples Clientes
Actualmente usas GitHub Releases (`provider: "github"` en tu build).
- **Problema de GitHub Releases:** Está diseñado para UN software por repositorio. Tratar de usar tags como `clienteA-v1.0.0` y `clienteB-v2.0.0` en el mismo repo confundirá al auto-updater de Electron.

### La Solución Recomendada: Almacenamiento S3 (AWS S3, Cloudflare R2 o DigitalOcean Spaces)
Estas soluciones son económicas y perfectamente escalables para alojar feeds privados por empresa.

1. **Cómo configurar el nuevo proveedor en `electron-builder`:**
   En el paquete de cada cliente, definirás un provider *genérico* apuntando a una URL / bucket único.
   ```json
   // clients/cliente-nuevo/package.json (fragmento de build)
   "publish": [
     {
       "provider": "generic",
       "url": "https://updates.tuservidor.com/cliente-nuevo/" 
     }
   ]
   ```

### Estrategia para NO ROMPER al cliente actual
1. **Mantener su infraestructura actual por ahora:** 
   En `clients/cliente-original/package.json`, dejarás intacta la configuración de GitHub Releases. Él seguirá buscando tags como `v5.4.1`, `v5.5.0` en tu repo como lo hace hoy.
2. **Actualización Puente (Cuando decidas migrarlo a S3):**
   Publica una versión (ej. v6.0.0) a través de GitHub Releases que en su código cambie la URL del updater hacia el nuevo bucket de S3. Una vez que todos los cajeros del cliente original descarguen esa versión, dejarán de consultar GitHub para sus futuras actualizaciones y consultarán tu S3.

---

## Cronograma Sugerido

| Etapa | Tarea | Riesgo | Tiempo Est. (Aprox)
|-------|-------|--------|---------------------
| Semana 1 | Pasar JS a TypeScript en la carpeta `electron`. Validar y probar compilación `tsc`. | Medio | 1 Semana
| Semana 2 | Refinar interfaces (DB) y aplicar inyección de dependencias en Core. | Medio-Alto | 1 Semana
| Semana 3 | Crear monorepo (packages/ y clients/), mover código y ajustar imports y `tsconfig` de Vite. | Alto | 1 Semana
| Semana 4 | Montar bucket de S3/Cloudflare R2, configurar `electron-builder` para un Cliente B (falso) y testear el auto-update y empaquetado. | Bajo | 3 Días
| Semana 5 | Pruebas de QA sobre el *Cliente Original* compilado desde la nueva arquitectura para asegurar 100% compatibilidad antes de lanzar al entorno de producción real. | Alto | 4 Días

## Resumen de Beneficios
- Si el "Cliente C" pide que su ticket de compra tenga 2 columnas extra, solo modificas su workspace, sin `ifs` en el Core.
- Publicas comandos dedicados: `pnpm run build --filter cliente-original`.
- Seguridad: un cliente no puede ver variables de entorno ni configuraciones del otro.