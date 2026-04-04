# BACE-ELECTRON

Proyecto de aplicación de escritorio usando **Electron** con **React + TypeScript** y soporte para **TailwindCSS**. También incluye integración con **PostgreSQL** para manejo de bases de datos.

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

