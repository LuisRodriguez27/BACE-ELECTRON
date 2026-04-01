const { Pool, types } = require('pg');

// Forzar que los campos DECIMAL (OID 1700), float4 (700) y float8 (701) devuelvan Number en vez de String
types.setTypeParser(1700, val => parseFloat(val));
types.setTypeParser(700, val => parseFloat(val));
types.setTypeParser(701, val => parseFloat(val));

// Forzar que los campos TIMESTAMP sin zona horaria (1114) se interpreten como UTC para mantener la compatibilidad y no aplicar el timezone por defecto del driver
types.setTypeParser(1114, val => new Date(val + 'Z'));

const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const { app, dialog } = require('electron');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN DE CONEXIÓN POSTGRESQL
// ============================================
// En desarrollo, la app usará PostgreSQL en tu PC (localhost).
// En producción (app empaquetada), se conectará al servidor PostgreSQL en el NAS de la red.
const isDev = !app.isPackaged;

// Cargar las variables de entorno desde el archivo .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'db', // Ajusta el nombre de la BD para produccion si es diferente
  password: process.env.DB_PASSWORD || '1234', // Pon la contraseña que use postgres en el NAS
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

const asyncLocalStorage = new AsyncLocalStorage();

async function queryWithContext(sql, args, method) {
  let i = 1;
  // Convertimos '?' a '$1', '$2', etc.
  let pgSql = sql.replace(/\?/g, () => `$${i++}`);

  // Agregar RETURNING * si es insert para postgres y no lo tiene
  if (method === 'run' && pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
    pgSql += ' RETURNING *';
  }

  const client = asyncLocalStorage.getStore() || pool;

  try {
    const result = await client.query(pgSql, args);
    if (method === 'get') {
      return result.rows[0] || null;
    }
    if (method === 'all') {
      return result.rows;
    }
    if (method === 'run') {
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null
      };
    }
  } catch (e) {
    if (e.code === '42P01') {
      // Table does not exist (posiblemente inicio sin esquema creado). Ignoralos por el script
      if (method === 'get') return null;
      if (method === 'all') return [];
      return { changes: 0, lastInsertRowid: null };
    }
    throw e;
  }
}

const db = {
  prepare: (sql) => {
    return {
      get: async (...args) => await queryWithContext(sql, args, 'get'),
      all: async (...args) => await queryWithContext(sql, args, 'all'),
      run: async (...args) => await queryWithContext(sql, args, 'run'),
    };
  },

  transaction: (fn) => {
    return async (...args) => {
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

  exec: async (sql) => {
    const client = asyncLocalStorage.getStore() || pool;
    return await client.query(sql);
  }
};

const pgSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER NOT NULL REFERENCES users(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    active INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    description TEXT,
    color VARCHAR(50),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    promo_price DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
  ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2);
  ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT;

  CREATE TABLE IF NOT EXISTS product_templates (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    final_price DECIMAL(10,2) NOT NULL,
    promo_price DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    colors TEXT,
    position TEXT,
    texts TEXT,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    active INTEGER NOT NULL DEFAULT 1
  );

  ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2);
  ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2);

  CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    edited_by INTEGER REFERENCES users(id),
    date TIMESTAMP NOT NULL,
    total DECIMAL(10,2) DEFAULT 0,
    converted_to_order INTEGER NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    edited_by INTEGER REFERENCES users(id),
    date TIMESTAMP NOT NULL,
    estimated_delivery_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'Revision', 
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    description TEXT,
    responsable VARCHAR(255),
    created_from_budget_id INTEGER REFERENCES budgets(id),
    active INTEGER NOT NULL DEFAULT 1
  );

  ALTER TABLE budgets DROP CONSTRAINT IF EXISTS fk_converted_to_order_id;
  ALTER TABLE budgets ADD CONSTRAINT fk_converted_to_order_id FOREIGN KEY (converted_to_order_id) REFERENCES orders(id);

  CREATE TABLE IF NOT EXISTS order_products (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    template_id INTEGER REFERENCES product_templates(id),
    quantity DECIMAL(10,4) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS budget_products (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id),
    product_id INTEGER REFERENCES products(id),
    template_id INTEGER REFERENCES product_templates(id),
    quantity DECIMAL(10,4) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP,
    descripcion TEXT,
    info TEXT
  );

  CREATE TABLE IF NOT EXISTS simple_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TIMESTAMP NOT NULL,
    concept TEXT NOT NULL,
    client_name VARCHAR(255),
    total DECIMAL(10,2) DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS simple_order_payments (
    id SERIAL PRIMARY KEY,
    simple_order_id INTEGER NOT NULL REFERENCES simple_orders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP NOT NULL,
    descripcion TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(active);
`;

async function initDb() {
  let client;
  try {
    client = await pool.connect();
    await client.query(pgSchema);

    // MIGRACIONES COMPATIBILIDAD V2 DE SQLITE a PG AUTOMATIZADAS
    // MIGRACION ESTADISTICAS Y PRESUPUESTOS
    const existingStatPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas'").get();
    let statPermId = existingStatPerm ? existingStatPerm.id : null;
    if (!statPermId) {
      const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas', 'Permite visualizar las estadisticas de ventas', 1)").run();
      statPermId = res.lastInsertRowid;
    }
    if (statPermId) {
      const existingUserPerm = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statPermId);
      if (!existingUserPerm) {
        try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(statPermId); } catch (e) { }
      }
    }

    const existingEditPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Editar Presupuestos'").get();
    let editPermId = existingEditPerm ? existingEditPerm.id : null;
    if (!editPermId) {
      const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Editar Presupuestos', 'Permite editar los presupuestos registrados', 1)").run();
      editPermId = res.lastInsertRowid;
    }
    if (editPermId) {
      const existingUserPerm2 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(editPermId);
      if (!existingUserPerm2) {
        try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(editPermId); } catch (e) { }
      }
    }

    const existingSeePay = await db.prepare("SELECT id FROM permissions WHERE name = 'Ver Pagos'").get();
    let payPermId = existingSeePay ? existingSeePay.id : null;
    if (!payPermId) {
      const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Ver Pagos', 'Permite ver los pagos registrados', 1)").run();
      payPermId = res.lastInsertRowid;
    }
    if (payPermId) {
      const existingUserPerm3 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(payPermId);
      if (!existingUserPerm3) {
        try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(payPermId); } catch (e) { }
      }
    }

    // ACTUALIZACION DE ESTADOS
    await db.prepare("UPDATE orders SET status = 'Revision' WHERE status = 'pendiente'").run();
    await db.prepare("UPDATE orders SET status = 'Produccion' WHERE status = 'en proceso'").run();
    await db.prepare("UPDATE orders SET status = 'Completado' WHERE status = 'completado'").run();
    await db.prepare("UPDATE orders SET status = 'Cancelado' WHERE status = 'cancelado'").run();

    // MIGRACION NUEVAS COLUMNAS PRODUCTOS
    try {
      await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2)");
      await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)");
      await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT");
    } catch (e) {
      console.log("Aviso: No se pudieron crear las columnas extra en products:", e.message);
    }

    // MIGRACION NUEVAS COLUMNAS PRODUCT TEMPLATES
    try {
      await client.query("ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2)");
      await client.query("ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)");
      await client.query("ALTER TABLE simple_orders ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)");
    } catch (e) {
      console.log("Aviso: No se pudieron crear las columnas de precio en product_templates o simple_orders:", e.message);
    }

    // MIGRACION PAYMENTS: order_id nullable + columna info
    try {
      await client.query("ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL");
    } catch (e) {
      console.log("Aviso: No se pudo hacer order_id nullable en payments:", e.message);
    }
    try {
      await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS info TEXT");
    } catch (e) {
      console.log("Aviso: No se pudo agregar columna info en payments:", e.message);
    }

    // Auto incremento check
    const checkOrderCount = await db.prepare('SELECT COUNT(*) as count, MAX(id) as maxId FROM orders').get();
    if (checkOrderCount && (checkOrderCount.count === '0' || (checkOrderCount.maxid && parseInt(checkOrderCount.maxid) < 14549))) {
      await client.query("SELECT setval('orders_id_seq', 14549, false)");
    }

    console.log("✅ Base de datos PG Inicializada");
  } catch (e) {
    console.error("❌ Error inicializando Postgres DB:", e);
  } finally {
    if (client) client.release();
  }
}

initDb();

module.exports = db;
