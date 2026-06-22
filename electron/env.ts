import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import * as log from 'electron-log';

// Determinar las rutas lógicas donde podría encontrarse el archivo .env
const possiblePaths: string[] = [];

if (app.isPackaged) {
  // En producción, buscamos primero al lado del ejecutable BACE.exe
  const exeDir = path.dirname(process.execPath);
  possiblePaths.push(path.join(exeDir, '.env'));
  
  // Y como fallback en producción, buscamos dentro de resources/app.asar (empaquetado)
  possiblePaths.push(path.join(app.getAppPath(), '.env'));
} else {
  // En desarrollo, buscamos en la raíz del proyecto
  possiblePaths.push(path.join(app.getAppPath(), '.env'));
  possiblePaths.push(path.join(__dirname, '..', '.env'));
  possiblePaths.push(path.join(__dirname, '../..', '.env'));
}

// Agregar también el cwd como alternativa de respaldo
possiblePaths.push(path.join(process.cwd(), '.env'));

let loaded = false;

// Evitar duplicados de ruta
const uniquePaths = Array.from(new Set(possiblePaths.filter((p): p is string => !!p)));

for (const envPath of uniquePaths) {
  try {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      log.info(`[ENV] Variables de entorno cargadas con éxito desde: ${envPath}`);
      loaded = true;
      break;
    }
  } catch (err) {
    log.error(`[ENV] Error al verificar o cargar el archivo en ${envPath}:`, err);
  }
}

if (!loaded) {
  dotenv.config();
  log.warn('[ENV] No se pudo cargar ningún archivo .env en las rutas conocidas. Usando variables predefinidas del sistema.');
}
