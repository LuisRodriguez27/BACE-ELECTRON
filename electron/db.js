const path = require('path');
const Database = require('better-sqlite3');
const { app } = require('electron');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN - EDITA AQUÍ PARA CADA INSTALADOR
// ============================================
const CONFIG = {
  // PARA PC SERVIDOR: modo = 'local'
  // PARA PC CLIENTES: modo = 'network'
  modo: 'local',  // Cambia esto según el instalador que generes
  
  // Solo necesario para modo 'network'
  serverIP: '192.168.50.1',
  serverUser: 'Luis'  // Usuario de Windows de la PC servidor
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
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const localPath = path.join(dbDir, 'data.db');
    console.log('💻 MODO LOCAL (SERVIDOR):', localPath);
    return localPath;
  }

  // Modo producción - NETWORK (PC Clientes)
  if (CONFIG.modo === 'network') {
    const networkPath = `\\\\${CONFIG.serverIP}\\Users\\${CONFIG.serverUser}\\AppData\\Roaming\\bace-electron\\database\\data.db`;
    console.log('🌐 MODO RED (CLIENTE):', networkPath);
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

console.log('📁 Ruta final de base de datos:', dbPath);

// Configuración de SQLite optimizada
const db = new Database(dbPath, {
  timeout: 10000,
});

// Configuraciones para mejor rendimiento
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 10000');

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

module.exports = db;
