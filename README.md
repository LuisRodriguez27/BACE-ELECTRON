# BACE-ELECTRON

Proyecto de aplicación de escritorio usando **Electron** con **React + TypeScript** y soporte para **TailwindCSS**. También incluye integración con **Better SQLite3** para manejo de bases de datos locales.

---

## Estructura del proyecto
```text
BACE-ELECTRON/
├─ electron/           # Archivos del proceso principal de Electron
│  └─ db.js
│  └─ index.js
│  └─ preload.js
│  └─ seed.js
│  └─ src/
│     └─ 
├─ rederer/            # Proyecto de frontend creado con Vite + React + TypeScript
├─ sqlite/             # Base de datos usando better-sqlite3
│  └─ data.db/
├─ node_modules/       # Dependencias instaladas
├─ package.json
└─ package-lock.json
```
---

## Tecnologías utilizadas

- [Electron](https://www.electronjs.org/) – Plataforma para crear aplicaciones de escritorio con JavaScript.
- [React](https://reactjs.org/) – Librería para construir interfaces de usuario.
- [TypeScript](https://www.typescriptlang.org/) – Superset de JavaScript para tipado estático.
- [Vite](https://vitejs.dev/) – Herramienta de construcción rápida para proyectos frontend.
- [TailwindCSS](https://tailwindcss.com/) – Framework CSS para estilos utilitarios.
- [Better SQLite3](https://www.npmjs.com/package/better-sqlite3) – Módulo para manejo eficiente de bases de datos SQLite en Node.js.
- [Concurrently](https://www.npmjs.com/package/concurrently) – Ejecuta múltiples comandos npm en paralelo.
- [@electron/rebuild](https://www.npmjs.com/package/@electron/rebuild) – Reconstruye módulos nativos para compatibilidad con Electron.

---

## Scripts útiles

### Iniciar aplicación en desarrollo
Ejecuta Electron y el frontend de React al mismo tiempo:

`npm run devg`


### Compilar frontend para producción
Genera los archivos optimizados de React + TypeScript:

`npm run buildg`


### Ejecutar archivo 'seed.js'

`npx electron electron/seed.js`

### Reconstruir módulos nativos para Electron
Útil después de instalar paquetes que contienen bindings nativos:

`npm run frebuild`


## Instalación de paquetes

Durante el desarrollo se instalaron los siguientes paquetes:

Electron:

npm install electron --save-dev



- `npm i @electron/rebuild`
- `npm create vite@latest rederer`
- `npm i better-sqlite3`
- `npm i tailwindcss @tailwindcss/vite`
- `npm i concurrently --save-dev`

### Nota

- concurrently permite ejecutar varios procesos de desarrollo a la vez (Electron + frontend) en una sola terminal.
- @electron/rebuild es necesario para que los módulos nativos (como better-sqlite3) funcionen correctamente con la versión de Electron instalada.
