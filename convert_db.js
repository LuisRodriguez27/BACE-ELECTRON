const fs = require('fs');
const dbContent = fs.readFileSync('./electron/db.js', 'utf8');

let pgDb = `const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bace_electron', // Cambia esto si tu BD se llama diferente
  password: 'admin',         // Cambia por tu contraseña de postgres
  port: 5432,
});

const schema = \`
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
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS product_templates (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    final_price DECIMAL(10,2) NOT NULL,
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    colors TEXT,
    position TEXT,
    texts TEXT,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    active INTEGER NOT NULL DEFAULT 1
  );

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

  ALTER TABLE budgets ADD CONSTRAINT fk_converted_to_order_id FOREIGN KEY (converted_to_order_id) REFERENCES orders(id);

  CREATE TABLE IF NOT EXISTS order_products (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    template_id INTEGER REFERENCES product_templates(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS budget_products (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id),
    product_id INTEGER REFERENCES products(id),
    template_id INTEGER REFERENCES product_templates(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMP,
    descripcion TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON budgets(client_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(active);
\`;

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(schema);

    // Ajustar sequencia orders si es necesario (migration)
    const { rows } = await client.query('SELECT COUNT(*) as count, MAX(id) as max_id FROM orders');
    const orderCount = parseInt(rows[0].count);
    const maxId = rows[0].max_id ? parseInt(rows[0].max_id) : 0;
    if (orderCount === 0 || maxId < 14549) {
      await client.query("SELECT setval('orders_id_seq', 14549, false)");
    }

    // Insertar permisos iniciales si no existen
    const permEst = await client.query("SELECT id FROM permissions WHERE name = 'Estadisticas'");
    let statPermId;
    if (permEst.rows.length === 0) {
      const p = await client.query("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas', 'Permite visualizar las estadisticas de ventas', 1) RETURNING id");
      statPermId = p.rows[0].id;
    } else {
      statPermId = permEst.rows[0].id;
    }

    if (statPermId) {
      const up = await client.query("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [statPermId]);
      if (up.rows.length === 0) {
        // Envolver en try/catch por si el usuario 1 no existe aún (durante el seeder)
        try {
          await client.query("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, 1)", [statPermId]);
        } catch(e) {}
      }
    }

    const permBudg = await client.query("SELECT id FROM permissions WHERE name = 'Editar Presupuestos'");
    let editBudgetPermId;
    if (permBudg.rows.length === 0) {
      const p = await client.query("INSERT INTO permissions (name, description, active) VALUES ('Editar Presupuestos', 'Permite editar los presupuestos registrados', 1) RETURNING id");
      editBudgetPermId = p.rows[0].id;
    } else {
      editBudgetPermId = permBudg.rows[0].id;
    }

    if (editBudgetPermId) {
      const up = await client.query("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [editBudgetPermId]);
      if (up.rows.length === 0) {
        try {
          await client.query("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, 1)", [editBudgetPermId]);
        } catch(e) {}
      }
    }

    console.log("✅ Base de datos (Pg) inicializada correctamente.");
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
  } finally {
    client.release();
  }
}

initDb();

module.exports = pool;
\`;

fs.writeFileSync('./electron/db.js', pgDb);
console.log('db.js rewritten for pg');
