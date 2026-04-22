const { Pool, types } = require('pg');

// Forzar que los campos DECIMAL (OID 1700), float4 (700) y float8 (701) devuelvan Number
// ADVERTENCIA: Usar parseFloat con DECIMAL puede causar pérdida de precisión en centavos. 
// Para solucionarlo de raíz sin tirar prod, tendrías que cambiar tu frontend para que no use .toFixed() en numbers, sino manejar strings. Lo dejamos así para que no truene tu frontend actual.
types.setTypeParser(1700, val => parseFloat(val));
types.setTypeParser(700, val => parseFloat(val));
types.setTypeParser(701, val => parseFloat(val));

// Las columnas de fecha usan TIMESTAMPTZ — el driver pg las retorna como Date de JS automáticamente.
// NO se necesita el hack manual de añadir 'Z' porque Postgres ya gestiona la zona horaria.

const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const { app, dialog } = require('electron');
const fs = require('fs');
const { runMigrations } = require('./migrations');

// ============================================
// CONFIGURACIÓN DE CONEXIÓN POSTGRESQL
// ============================================
// En desarrollo, la app usará PostgreSQL en tu PC (localhost).
// En producción (app empaquetada), se conectará al servidor PostgreSQL en el NAS de la red.
const isDev = !app.isPackaged;

// Cargar las variables de entorno desde el archivo .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: isDev ? process.env.DEV_DB_USER : process.env.PROD_DB_USER,
  host: isDev ? process.env.DEV_DB_HOST : process.env.PROD_DB_HOST,
  database: isDev ? process.env.DEV_DB_NAME : process.env.PROD_DB_NAME,
  password: isDev ? process.env.DEV_DB_PASSWORD : process.env.PROD_DB_PASSWORD,
  port: parseInt(isDev ? process.env.DEV_DB_PORT : process.env.PROD_DB_PORT, 10),
});

const asyncLocalStorage = new AsyncLocalStorage();

const db = {
  async getOne(sql, params = []) {
    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", sql, "\nParams:", params);
      throw e;
    }
  },

  async getAll(sql, params = []) {
    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", sql, "\nParams:", params);
      throw e;
    }
  },

  async execute(sql, params = []) {
    let pgSql = sql;

    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING *';
    }

    const client = asyncLocalStorage.getStore() || pool;
    try {
      const result = await client.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null
      };
    } catch (e) {
      console.error("Database Error:", e.message, "\nQuery:", pgSql, "\nParams:", params);
      throw e;
    }
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

  async exec(sql) {
    const client = asyncLocalStorage.getStore() || pool;
    return await client.query(sql);
  }
};

const pgSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INTEGER NOT NULL REFERENCES users(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    description TEXT,
    color VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    promo_price DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );


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
    active BOOLEAN NOT NULL DEFAULT TRUE
  );


  CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    edited_by INTEGER REFERENCES users(id),
    date TIMESTAMPTZ NOT NULL,
    total DECIMAL(10,2) DEFAULT 0,
    converted_to_order INTEGER NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    edited_by INTEGER REFERENCES users(id),
    date TIMESTAMPTZ NOT NULL,
    estimated_delivery_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'Revision', 
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    description TEXT,
    responsable VARCHAR(255),
    created_from_budget_id INTEGER REFERENCES budgets(id),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );


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
    date TIMESTAMPTZ,
    descripcion TEXT,
    info TEXT
  );

  CREATE TABLE IF NOT EXISTS simple_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TIMESTAMPTZ NOT NULL,
    concept TEXT NOT NULL,
    client_name VARCHAR(255),
    total DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS simple_order_payments (
    id SERIAL PRIMARY KEY,
    simple_order_id INTEGER NOT NULL REFERENCES simple_orders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    descripcion TEXT
  );

  -- ============================================================
  -- ÍNDICES DE RENDIMIENTO (Llaves foráneas + columnas frecuentes)
  -- PostgreSQL NO crea índices automáticos para FKs, hay que hacerlo
  -- manualmente para evitar Full Table Scans en tablas grandes.
  -- ============================================================

  -- user_permissions
  CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id       ON user_permissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);

  -- product_templates
  CREATE INDEX IF NOT EXISTS idx_product_templates_product_id   ON product_templates(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_templates_created_by   ON product_templates(created_by);

  -- budgets
  CREATE INDEX IF NOT EXISTS idx_budgets_client_id              ON budgets(client_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_id                ON budgets(user_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_edited_by              ON budgets(edited_by);
  CREATE INDEX IF NOT EXISTS idx_budgets_converted_to_order_id  ON budgets(converted_to_order_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_active                 ON budgets(active);

  -- orders
  CREATE INDEX IF NOT EXISTS idx_orders_client_id               ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id                 ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_edited_by               ON orders(edited_by);
  CREATE INDEX IF NOT EXISTS idx_orders_created_from_budget_id  ON orders(created_from_budget_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status                  ON orders(status);

  -- order_products
  CREATE INDEX IF NOT EXISTS idx_order_products_order_id        ON order_products(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_products_product_id      ON order_products(product_id);
  CREATE INDEX IF NOT EXISTS idx_order_products_template_id     ON order_products(template_id);

  -- budget_products
  CREATE INDEX IF NOT EXISTS idx_budget_products_budget_id      ON budget_products(budget_id);
  CREATE INDEX IF NOT EXISTS idx_budget_products_product_id     ON budget_products(product_id);
  CREATE INDEX IF NOT EXISTS idx_budget_products_template_id    ON budget_products(template_id);

  -- payments
  CREATE INDEX IF NOT EXISTS idx_payments_order_id              ON payments(order_id);

  -- products
  CREATE INDEX IF NOT EXISTS idx_products_active                ON products(active);

  -- simple_orders
  CREATE INDEX IF NOT EXISTS idx_simple_orders_user_id          ON simple_orders(user_id);

  -- simple_order_payments
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_simple_order_id ON simple_order_payments(simple_order_id);
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_user_id         ON simple_order_payments(user_id);
`;

async function initDb() {
  let client;
  try {
    client = await pool.connect();
    await client.query(pgSchema);

    await runMigrations(db, client);

    console.log("✅ Base de datos PG Inicializada");
  } catch (e) {
    console.error("❌ Error inicializando Postgres DB:", e);
  } finally {
    if (client) client.release();
  }
}

initDb();

module.exports = db;
