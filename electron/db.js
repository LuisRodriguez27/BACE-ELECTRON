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
  modo: 'network',  
  
  // MODO LOCAL: Ruta absoluta donde se encuentra la base de datos en el servidor
  // Si dejas null, usará el escritorio del usuario actual (app.getPath('desktop'))
  serverLocalPath: 'C:\\Users\\Bace Gpo Impresor\\Desktop\\bace-electron\\database',
  
  // MODO RED 'network' (Clientes):
  networkDrive: null, // 'Z:' si se usa unidad mapeada, null para usar ruta UNC con IP
  serverIP: '192.168.1.90',
  
  // Ruta de la carpeta compartida en la red (relativa a la IP o unidad)
  // Ejemplo: 'personal_folder/bace-electron' genera \\IP\personal_folder\bace-electron
  networkFolder: 'personal_folder/bace-electron/database'
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
    const dbDir = CONFIG.serverLocalPath;
    
    console.log('📂 Ruta local configurada:', dbDir);
    
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
    
    if (!fs.existsSync(localPath)) {
      console.error('❌ ERROR: data.db no encontrado en:', localPath);
    } else {
      console.log('✅ Base de datos encontrada');
    }
    
    return localPath;
  }

  // Modo producción - NETWORK (PC Clientes)
  if (CONFIG.modo === 'network') {
    let networkPath;
    
    if (CONFIG.networkDrive) {
      // Usar unidad mapeada
      networkPath = path.join(CONFIG.networkDrive, CONFIG.networkFolder, 'data.db');
      console.log('🌐 MODO RED (Unidad Mapeada):', networkPath);
    } else {
      // Usar ruta UNC manual para evitar problemas
      const normalizedFolder = CONFIG.networkFolder.replace(/\//g, '\\');
      networkPath = `\\\\${CONFIG.serverIP}\\${normalizedFolder}\\data.db`;
      console.log('🌐 MODO RED (UNC Path):', networkPath);
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
    const dbDir = path.dirname(dbPath);
    
    let specificError = '';
    try {
      // Intentar leer obligatoriamente el directorio para verificar permisos reales
      const files = fs.readdirSync(dbDir);
      
      // Si llegamos aquí, SÍ hay acceso a la carpeta
      if (files.includes('data.db')) {
        specificError = `
⚠️ El sistema puede leer la carpeta y ve el archivo 'data.db', 
pero fs.existsSync falló. Esto es inusual.`;
      } else {
        specificError = `
✅ La carpeta del servidor ES accesible (Permisos OK).
❌ PERO el archivo 'data.db' NO existe en esa ubicación.

Archivos encontrados en la carpeta: 
${files.slice(0, 10).join(', ')}

SOLUCIÓN:
Asegúrate de que la base de datos 'data.db' esté en esa carpeta.`;
      }
    } catch (err) {
      // Capturamos el error real de acceso (EPERM, EACCES, ENOENT, etc)
      specificError = `
❌ ACCESO DENEGADO o RUTA INVÁLIDA
La aplicación no tiene permiso para leer la carpeta o no la encuentra.

Error Sistema: ${err.message}
Código Error: ${err.code}

NOTA IMPORTANTE: 
Si ejecutas la app como Administrador, es posible que pierdas acceso 
a las unidades de red del usuario normal. Intenta ejecutarla sin permisos de admin.`;
    }

    const driveInfo = CONFIG.networkDrive 
      ? `Unidad mapeada: ${CONFIG.networkDrive}`
      : `Servidor: ${CONFIG.serverIP}`;
    
    const checkPath = CONFIG.networkDrive
      ? CONFIG.networkDrive
      : `\\\\${CONFIG.serverIP}`;
    
    const fullFolderPath = CONFIG.networkDrive 
      ? path.join(CONFIG.networkDrive, CONFIG.networkFolder)
      : `\\\\${CONFIG.serverIP}\\${CONFIG.networkFolder.replace(/\//g, '\\')}`;

    const errorMsg = `
❌ ERROR DE CONEXIÓN A RED

No se puede acceder a la base de datos del servidor.

Ruta intentada: ${dbPath}

DIAGNÓSTICO:
${specificError}

CONFIGURACIÓN:
${driveInfo}
Carpeta Red: ${CONFIG.networkFolder}

POSIBLES CAUSAS:
1. La PC servidor está apagada o no accesible en ${CONFIG.serverIP}
2. La carpeta "${CONFIG.networkFolder}" no existe o no está compartida
3. No tienes permisos de acceso a la ruta especificada
4. El archivo data.db no ha sido creado todavía en el servidor

SOLUCIÓN:
1. Verifica que puedes abrir esta ruta en el Explorador:
   ${fullFolderPath}

2. Si usas unidad mapeada (${CONFIG.networkDrive}), verifica que está conectada.
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

  // ============================================
  // MIGRACIÓN: ESTADOS DE ORDEN
  // ============================================
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pendiente'").get();
  if (pendingOrders.count > 0) {
    console.log(`🛠 Migración: Actualizando ${pendingOrders.count} órdenes de 'pendiente' a 'Revision'`);
    db.prepare("UPDATE orders SET status = 'Revision' WHERE status = 'pendiente'").run();
  }

  const inProgressOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'en proceso'").get();
  if (inProgressOrders.count > 0) {
    console.log(`🛠 Migración: Actualizando ${inProgressOrders.count} órdenes de 'en proceso' a 'Produccion'`);
    db.prepare("UPDATE orders SET status = 'Produccion' WHERE status = 'en proceso'").run();
  }

  const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completado'").get();
  if (completedOrders.count > 0) {
    console.log(`🛠 Migración: Actualizando ${completedOrders.count} órdenes de 'completado' a 'Completado'`);
    db.prepare("UPDATE orders SET status = 'Completado' WHERE status = 'completado'").run();
  }

  const cancelledOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelado'").get();
  if (cancelledOrders.count > 0) {
    console.log(`🛠 Migración: Actualizando ${cancelledOrders.count} órdenes de 'cancelado' a 'Cancelado'`);
    db.prepare("UPDATE orders SET status = 'Cancelado' WHERE status = 'cancelado'").run();
  }

} catch (error) {
  console.error('❌ Error en migraciones:', error);
}

module.exports = db;
