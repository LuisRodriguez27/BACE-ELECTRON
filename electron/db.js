const path = require('path');
const Database = require('better-sqlite3');
const { app, dialog } = require('electron');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN - EDITA AQUÍ PARA CADA INSTALADOR
// ============================================
const CONFIG = {
  // PARA PC SERVIDOR: modo = 'local'
  // PARA PC CLIENTES: modo = 'network'
  modo: 'network',  // Cambia esto según el instalador que generes
  
  // RUTA FIJA para el servidor (modo 'local')
  // IMPORTANTE: Esta debe ser la ruta COMPLETA al escritorio donde está la BD
  // Si dejas null, usará el escritorio del usuario actual (app.getPath('desktop'))
  serverDesktopPath: 'C:\\Users\\Bace Gpo Impresor\\Desktop',  // Ruta fija al escritorio del servidor
  
  // Solo necesario para modo 'network'
  // IMPORTANTE: Si el escritorio del servidor está montado como unidad Z:
  // usa 'Z: o V:' como networkDrive. Si usas UNC path, deja networkDrive en null
  networkDrive: 'V:',  // Ej: 'Z:' o null para usar UNC path
  serverIP: 'PCSITA',  // Solo si networkDrive es null
  serverUser: 'Bace Gpo Impresor',  // Solo si networkDrive es null
  
  // Ruta relativa desde el escritorio donde está la carpeta de la BD
  // Ej: 'bace-electron/database' si la carpeta está en Escritorio/bace-electron/database
  desktopFolder: 'bace-electron/database'  // Carpeta dentro del escritorio del servidor
};
// ============================================

/**
 * Obtener la ruta de la base de datos
 */
function getDatabasePath() {
  // Modo desarrollo
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, '../sqlite/data.db');
    console.log('🔧 DESARROLLO:', devPath);
    return devPath;
  }

  // Modo producción - LOCAL (PC Servidor)
  if (CONFIG.modo === 'local') {
    // Usar ruta fija si está configurada, sino usar escritorio del usuario actual
    const desktopPath = CONFIG.serverDesktopPath || app.getPath('desktop');
    const dbDir = path.join(desktopPath, CONFIG.desktopFolder);
    
    console.log('📂 Ruta del escritorio:', desktopPath);
    console.log('📂 Ruta de la base de datos:', dbDir);
    
    if (!fs.existsSync(dbDir)) {
      console.log('⚠️ La carpeta no existe, intentando crearla...');
      try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✅ Carpeta creada exitosamente');
      } catch (error) {
        console.error('❌ Error al crear carpeta:', error);
      }
    }
    
    const localPath = path.join(dbDir, 'data.db');
    console.log('💻 MODO LOCAL (SERVIDOR):', localPath);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(localPath)) {
      console.error('❌ ERROR: No se encontró el archivo data.db en:', localPath);
      console.log('📋 Contenido de la carpeta:');
      try {
        const files = fs.readdirSync(dbDir);
        console.log(files);
      } catch (error) {
        console.error('No se pudo leer la carpeta:', error);
      }
    } else {
      console.log('✅ Archivo data.db encontrado');
    }
    
    return localPath;
  }

  // Modo producción - NETWORK (PC Clientes)
  if (CONFIG.modo === 'network') {
    let networkPath;
    
    if (CONFIG.networkDrive) {
      // Usar unidad mapeada (ej: Z:)
      networkPath = path.join(CONFIG.networkDrive, CONFIG.desktopFolder, 'data.db');
      console.log('🌐 MODO RED (CLIENTE - Unidad Mapeada):', networkPath);
    } else {
      // Usar ruta UNC
      const desktopUNC = `\\\\${CONFIG.serverIP}\\Users\\${CONFIG.serverUser}\\Desktop`;
      networkPath = path.join(desktopUNC, CONFIG.desktopFolder, 'data.db').replace(/\\/g, '\\');
      console.log('🌐 MODO RED (CLIENTE - UNC Path):', networkPath);
    }
    
    return networkPath;
  }

  // Fallback a local
  console.warn('⚠️ Configuración no válida, usando modo local');
  return path.join(app.getPath('userData'), 'database', 'data.db');
}

const dbPath = getDatabasePath();

// Asegurar que el directorio existe (solo para modo local)
if (CONFIG.modo === 'local' && app.isPackaged) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (error) {
      console.error('❌ Error creando directorio:', error);
    }
  }
}

// Validar acceso en modo network
if (CONFIG.modo === 'network' && app.isPackaged) {
  console.log('📁 Intentando acceder a:', dbPath);
  
  // Verificar si el archivo existe
  if (!fs.existsSync(dbPath)) {
    const driveInfo = CONFIG.networkDrive 
      ? `Unidad mapeada: ${CONFIG.networkDrive}`
      : `Servidor: ${CONFIG.serverIP} (Usuario: ${CONFIG.serverUser})`;
    
    const checkPath = CONFIG.networkDrive
      ? CONFIG.networkDrive
      : `\\\\${CONFIG.serverIP}\\Users\\${CONFIG.serverUser}\\Desktop`;
    
    const errorMsg = `
❌ ERROR DE CONEXIÓN A RED

No se puede acceder a la base de datos del servidor.

Ruta: ${dbPath}

CONFIGURACIÓN:
${driveInfo}
Carpeta: ${CONFIG.desktopFolder}

POSIBLES CAUSAS:
1. La PC servidor está apagada o no accesible
2. La unidad ${CONFIG.networkDrive || 'de red'} no está montada correctamente
3. La carpeta "${CONFIG.desktopFolder}" no existe en el escritorio del servidor
4. No tienes permisos de acceso a la carpeta compartida
5. El firewall está bloqueando la conexión

SOLUCIÓN:
1. Verifica que puedes abrir esta ruta en el Explorador:
   ${checkPath}

2. Si usas unidad mapeada (${CONFIG.networkDrive}), verifica que está conectada:
   - Abre "Este equipo" y busca la unidad ${CONFIG.networkDrive}
   - Si no aparece, vuelve a mapearla desde el servidor

3. Asegúrate de que existe la carpeta:
   ${checkPath}\\${CONFIG.desktopFolder}
    `.trim();
    
    console.error(errorMsg);
    
    // Mostrar diálogo de error al usuario
    dialog.showErrorBox('Error de Conexión a Red', errorMsg);
    
    app.quit();
    process.exit(1);
  }
  
  console.log('✅ Archivo de base de datos encontrado');
}

console.log('📁 Ruta final de base de datos:', dbPath);

// Configuración de SQLite optimizada
// Solo el servidor crea la base de datos, los clientes deben encontrarla existente
const dbOptions = {
  timeout: 30000, // 30 segundos de timeout (aumentado para red)
};

// Solo en modo network, requerir que el archivo exista
if (CONFIG.modo === 'network' && app.isPackaged) {
  dbOptions.fileMustExist = true;
}

const db = new Database(dbPath, dbOptions);

// Configuraciones según el modo
if (app.isPackaged) {
  // En producción, SIEMPRE usar DELETE mode para compatibilidad de red
  console.log('⚙️ Configurando SQLite para PRODUCCIÓN (modo compatible con red)');
  db.pragma('journal_mode = DELETE');
  db.pragma('synchronous = FULL');
  db.pragma('locking_mode = NORMAL'); // Permitir múltiples conexiones
  db.pragma('busy_timeout = 30000'); // 30 segundos esperando si está bloqueada
} else {
  // En desarrollo, usar WAL (mejor rendimiento)
  console.log('⚙️ Configurando SQLite para DESARROLLO');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
}

db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS permissions  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    description TEXT,
    color TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    serial_number TEXT UNIQUE,
    price REAL NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS product_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    final_price REAL NOT NULL,
    width REAL,
    height REAL,
    colors TEXT,
    position TEXT,
    texts TEXT,
    description TEXT,
    created_by INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    edited_by INTEGER,
    date TIMESTAMP NOT NULL,
    estimated_delivery_date TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pendiente', 
    total REAL DEFAULT 0,
    notes TEXT,
    description TEXT,
    created_from_budget_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (edited_by) REFERENCES users(id),
    FOREIGN KEY (created_from_budget_id) REFERENCES budgets(id)
  );

  CREATE TABLE IF NOT EXISTS order_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    template_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (template_id) REFERENCES product_templates(id)
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    edited_by INTEGER,
    date TIMESTAMP NOT NULL,
    total REAL DEFAULT 0,
    converted_to_order INTEGER NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (edited_by) REFERENCES users(id),
    FOREIGN KEY (converted_to_order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS budget_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    product_id INTEGER,
    template_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (budget_id) REFERENCES budgets(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (template_id) REFERENCES product_templates(id)
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TIMESTAMP,
    descripcion TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON budgets(client_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(active);
`);

// ==========================================================
// Migraciones de esquema (para instalaciones existentes)
// ==========================================================
try {
  const existingOrderColumns = db.prepare('PRAGMA table_info(orders)').all();
  const hasDescription = existingOrderColumns.some(c => c.name === 'description');
  if (!hasDescription) {
    console.log('🛠 Migración: agregando columna description a orders');
    db.exec('ALTER TABLE orders ADD COLUMN description TEXT');
    console.log('✅ Columna description agregada correctamente');
  }
} catch (migrationError) {
  console.error('❌ Error aplicando migración de orders.description:', migrationError);
}

// Configurar el autoincremento de orders para empezar desde 14550
// Solo se ejecuta si no hay órdenes existentes o si el último ID es menor a 14550
const checkOrderCount = db.prepare('SELECT COUNT(*) as count, MAX(id) as maxId FROM orders').get();
if (checkOrderCount.count === 0 || (checkOrderCount.maxId && checkOrderCount.maxId < 14549)) {
  console.log('⚙️ Configurando autoincremento de órdenes para empezar desde 14550');
  db.exec(`UPDATE sqlite_sequence SET seq = 14549 WHERE name = 'orders'`);
  
  // Si no existe entrada en sqlite_sequence para orders, la creamos
  const sequenceExists = db.prepare('SELECT name FROM sqlite_sequence WHERE name = ?').get('orders');
  if (!sequenceExists) {
    db.exec(`INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', 14549)`);
  }
  
  console.log('✅ Próxima orden será ID: 14550');
}

// ============================================
// MIGRACIÓN: ESTADÍSTICAS
// ============================================
try {
  let statPermId;
  const existingStatPerm = db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas'").get();
  
  if (!existingStatPerm) {
    console.log('🛠 Migración: agregando permiso Estadisticas');
    const result = db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas', 'Permite visualizar las estadisticas de ventas', 1)").run();
    statPermId = result.lastInsertRowid;
    console.log('✅ Permiso Estadisticas creado con éxito.');
  } else {
    statPermId = existingStatPerm.id;
  }

  if (statPermId) {
    const existingUserPerm = db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statPermId);
    if (!existingUserPerm) {
      db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(statPermId);
      console.log(`✅ Permiso Estadisticas (${statPermId}) asignado al usuario 1`);
    }
  }

  // ============================================
  // MIGRACIÓN: EDITAR PRESUPUESTOS
  // ============================================
  const existingEditBudgetPerm = db.prepare("SELECT id FROM permissions WHERE name = 'Editar Presupuestos'").get();
  let editBudgetPermId;

  if (!existingEditBudgetPerm) {
    console.log('🛠 Migración: agregando permiso Editar Presupuestos');
    const result = db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Editar Presupuestos', 'Permite editar los presupuestos registrados', 1)").run();
    editBudgetPermId = result.lastInsertRowid;
    console.log('✅ Permiso Editar Presupuestos creado con éxito.');
  } else {
    editBudgetPermId = existingEditBudgetPerm.id;
  }

  if (editBudgetPermId) {
    const existingUserEditBudgetPerm = db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(editBudgetPermId);
    if (!existingUserEditBudgetPerm) {
      db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(editBudgetPermId);
      console.log(`✅ Permiso Editar Presupuestos (${editBudgetPermId}) asignado al usuario 1`);
    }
  }

} catch (error) {
  console.error('❌ Error en migraciones:', error);
}

module.exports = db;
