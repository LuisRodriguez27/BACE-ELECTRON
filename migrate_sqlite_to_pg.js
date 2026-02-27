const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');

// CAMBIAR `isProd` A `true` para usar la ruta de producción en el NAS
const isProd = false; 

const sqliteDbPath = isProd 
  ? '\\\\192.168.1.90\\personal_folder\\bace-electron\\database\\data.db' 
  : './sqlite/data.db'; 
const pgPool = new Pool({
  user: 'postgres',
  host: isProd ? '192.168.1.90' : 'localhost',
  database: isProd ? 'bace_electron' : 'testdb', // Asegurate de poner el nombre correcto que creaste de postgres en producción
  password: '1234', // Contraseña de tu NAS
  port: 5432,
});

if (!fs.existsSync(sqliteDbPath)) {
  console.error(`❌ El archivo SQLite no existe en la ruta: ${sqliteDbPath}`);
  console.log('Por favor cambia la constante sqliteDbPath en el script indicando tu BD de SQLite ("data.db").');
  process.exit(1);
}

const sqliteDb = new Database(sqliteDbPath, { fileMustExist: true });

// Función auxiliar para leer todo de una tabla SQLite usando better-sqlite3
function fetchSqliteTable(tableName) {
  const stmt = sqliteDb.prepare(`SELECT * FROM ${tableName}`);
  return stmt.all();
}

// Función principal de migración
async function migrateData() {
  const pgClient = await pgPool.connect();

  try {
    console.log('🚀 Iniciando migración de datos de SQLite (better-sqlite3) a PostgreSQL...');

    // Deshabilitar constraints temporalmente para poder insertar sin importar orden
    await pgClient.query('SET session_replication_role = replica');

    // MIGRAR USERS
    console.log('Migrando users...');
    const users = fetchSqliteTable('users');
    for (const u of users) {
      await pgClient.query(
        'INSERT INTO users (id, username, password, active) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password = EXCLUDED.password, active = EXCLUDED.active',
        [u.id, u.username, u.password, u.active]
      );
    }

    // MIGRAR PERMISSIONS
    console.log('Migrando permissions...');
    const permissions = fetchSqliteTable('permissions');
    for (const p of permissions) {
      await pgClient.query(
        'INSERT INTO permissions (id, name, description, active) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, active = EXCLUDED.active',
        [p.id, p.name, p.description, p.active]
      );
    }

    // MIGRAR USER_PERMISSIONS
    console.log('Migrando user_permissions...');
    const userPermissions = fetchSqliteTable('user_permissions');
    for (const up of userPermissions) {
      await pgClient.query(
        'INSERT INTO user_permissions (user_id, permission_id, active) VALUES ($1, $2, $3) ON CONFLICT (user_id, permission_id) DO NOTHING',
        [up.user_id, up.permission_id, up.active]
      );
    }

    // MIGRAR CLIENTS
    console.log('Migrando clients...');
    const clients = fetchSqliteTable('clients');
    for (const c of clients) {
      await pgClient.query(
        'INSERT INTO clients (id, name, phone, address, description, color, active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, address=EXCLUDED.address, description=EXCLUDED.description, color=EXCLUDED.color, active=EXCLUDED.active',
        [c.id, c.name, c.phone, c.address, c.description, c.color, c.active]
      );
    }

    // MIGRAR PRODUCTS
    console.log('Migrando products...');
    const products = fetchSqliteTable('products');
    for (const p of products) {
      await pgClient.query(
        'INSERT INTO products (id, name, serial_number, price, description, active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, serial_number=EXCLUDED.serial_number, price=EXCLUDED.price, description=EXCLUDED.description, active=EXCLUDED.active',
        [p.id, p.name, p.serial_number || null, Number(p.price) || 0, p.description, p.active]
      );
    }

    // MIGRAR PRODUCT TEMPLATES
    console.log('Migrando product_templates...');
    const templates = fetchSqliteTable('product_templates');
    for (const pt of templates) {
      await pgClient.query(
        'INSERT INTO product_templates (id, product_id, final_price, width, height, colors, position, texts, description, created_by, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET active=EXCLUDED.active',
        [pt.id, pt.product_id, Number(pt.final_price) || 0, pt.width ? Number(pt.width) : null, pt.height ? Number(pt.height) : null, pt.colors, pt.position, pt.texts, pt.description, pt.created_by || null, pt.active]
      );
    }

    // MIGRAR BUDGETS
    console.log('Migrando budgets...');
    const budgets = fetchSqliteTable('budgets');
    for (const b of budgets) {
      await pgClient.query(
        'INSERT INTO budgets (id, client_id, user_id, edited_by, date, total, converted_to_order, converted_to_order_id, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET active=EXCLUDED.active',
        [b.id, b.client_id, b.user_id, b.edited_by || null, new Date(b.date), Number(b.total) || 0, b.converted_to_order, b.converted_to_order_id || null, b.active]
      );
    }

    // MIGRAR ORDERS
    console.log('Migrando orders...');
    const orders = fetchSqliteTable('orders');
    for (const o of orders) {
      try {
        await pgClient.query(
          'INSERT INTO orders (id, client_id, user_id, edited_by, date, estimated_delivery_date, status, total, notes, description, responsable, created_from_budget_id, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET active=EXCLUDED.active',
          [o.id, o.client_id, o.user_id, o.edited_by || null, new Date(o.date), o.estimated_delivery_date ? new Date(o.estimated_delivery_date) : null, o.status, Number(o.total) || 0, o.notes, o.description, o.responsable, o.created_from_budget_id || null, o.active]
        );
      } catch(e) { console.error('Error en orders ID:', o.id, o); throw e; }
    }

    // MIGRAR BUDGET_PRODUCTS
    console.log('Migrando budget_products...');
    const budgetProducts = fetchSqliteTable('budget_products');
    for (const bp of budgetProducts) {
      try{
        await pgClient.query(
          'INSERT INTO budget_products (id, budget_id, product_id, template_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [bp.id, bp.budget_id, bp.product_id || null, bp.template_id || null, Number(bp.quantity) || 0, Number(bp.unit_price) || 0, Number(bp.total_price) || 0]
        );
       } catch(e) { console.error('Error en budget_products ID:', bp.id, bp); throw e; }
    }

    // MIGRAR ORDER_PRODUCTS
    console.log('Migrando order_products...');
    const orderProducts = fetchSqliteTable('order_products');
    for (const op of orderProducts) {
      try {
        await pgClient.query(
          'INSERT INTO order_products (id, order_id, product_id, template_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
          [op.id, op.order_id, op.product_id || null, op.template_id || null, Number(op.quantity) || 0, Number(op.unit_price) || 0, Number(op.total_price) || 0]
        );
      } catch(e) { console.error('Error en order_products ID:', op.id, op); throw e; }
    }

    // MIGRAR PAYMENTS
    console.log('Migrando payments...');
    const payments = fetchSqliteTable('payments');
    for (const p of payments) {
      await pgClient.query(
        'INSERT INTO payments (id, order_id, amount, date, descripcion) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [p.id, p.order_id, Number(p.amount) || 0, new Date(p.date), p.descripcion]
      );
    }

    // Reactivar constraints
    await pgClient.query('SET session_replication_role = DEFAULT');

    // ACTUALIZAR SECUENCIAS
    console.log('Actualizando secuencias autoincrementales...');
    const tables = ['users', 'permissions', 'clients', 'products', 'product_templates', 'budgets', 'orders', 'order_products', 'budget_products', 'payments'];
    for (const table of tables) {
      await pgClient.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}) + 1, 1), false);
      `);
    }

    console.log('✅ Migración completada con éxito.');

  } catch (err) {
    console.error('❌ Error durante la migración:', err);
    // Intentar reactivar constraints si falló
    try {
      await pgClient.query('SET session_replication_role = DEFAULT');
    } catch(e) {}
  } finally {
    pgClient.release();
    sqliteDb.close();
    await pgPool.end();
  }
}

migrateData();
