async function runMigrations(db, client) {
  // MIGRACION INICIAL (SI LA BD ESTÁ VACÍA)
  const userCount = await db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount && parseInt(userCount.count) === 0) {
    const bcrypt = require("bcryptjs");
    const passwordHash = bcrypt.hashSync("admin123", 10);
    const adminRes = await db.prepare("INSERT INTO users (username, password, active) VALUES (?, ?, ?)").run("admin", passwordHash, true);
    const adminId = adminRes.lastInsertRowid;

    const permissions = [
      // Usuarios y permisos
      ["Gestionar Usuario", "Permite crear, editar o desactivar usuarios", true],
      ["Gestionar Permisos", "Permite asignar o revocar permisos a los usuarios", true],

      // Clientes
      ["Crear Cliente", "Permite registrar nuevos clientes", true],
      ["Editar Cliente", "Permite modificar datos de clientes", true],
      ["Eliminar Cliente", "Permite eliminar o desactivar clientes", true],

      // Productos
      ["Crear Producto", "Permite registrar nuevos productos", true],
      ["Editar Producto", "Permite modificar información de productos", true],
      ["Eliminar Producto", "Permite eliminar o desactivar productos", true],

      // Plantillas de productos
      ["Crear Plantilla", "Permite crear plantillas de productos", true],
      ["Editar Plantilla", "Permite modificar plantillas de productos", true],
      ["Eliminar Plantilla", "Permite eliminar plantillas de productos", true],

      // Órdenes
      ["Crear Órdenes", "Permite registrar nuevas órdenes", true],
      ["Editar Órdenes", "Permite modificar órdenes", true],
      ["Cancelar Órdenes", "Permite cancelar órdenes", true],

      // Presupuestos
      ["Crear Presupuestos", "Permite registrar nuevos presupuestos", true],
      ["Eliminar Presupuestos", "Permite eliminar presupuestos", true],
      ["Editar Presupuestos", "Permite editar los presupuestos registrados", true],

      // Pagos
      ["Ver pagos", "Permite ver los pagos registrados", true],
      ["Registrar Pagos", "Permite registrar pagos en órdenes", true],
      ["Eliminar Pagos", "Permite eliminar o anular pagos", true],

      // Estadisticas
      ["Estadisticas", "Permite visualizar las estadisticas de ventas", true],
    ];

    for (const perm of permissions) {
      try {
        await db.prepare("INSERT INTO permissions (name, description, active) VALUES (?, ?, ?)").run(...perm);
      } catch (e) {
        if (e.code !== '23505') throw e; // Solo ignorar si es violación de unicidad
      }
    }

    const allPermissions = await db.prepare(`SELECT id FROM permissions`).all();
    for (const perm of allPermissions) {
      try {
        await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (?, ?, ?)").run(adminId, perm.id, true);
      } catch (e) {
        if (e.code !== '23505') throw e; // Solo ignorar si es llave duplicada
      }
    }
    console.log("Migración inicial: Usuario admin y permisos creados automáticamente.");
  }

  // MIGRACION ESTADISTICAS Y PRESUPUESTOS
  const existingStatPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas'").get();
  let statPermId = existingStatPerm ? existingStatPerm.id : null;
  if (!statPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas', 'Permite visualizar las estadisticas de ventas', true)").run();
    statPermId = res.lastInsertRowid;
  }
  if (statPermId) {
    const existingUserPerm = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statPermId);
    if (!existingUserPerm) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, true)").run(statPermId); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingEditPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Editar Presupuestos'").get();
  let editPermId = existingEditPerm ? existingEditPerm.id : null;
  if (!editPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Editar Presupuestos', 'Permite editar los presupuestos registrados', true)").run();
    editPermId = res.lastInsertRowid;
  }
  if (editPermId) {
    const existingUserPerm2 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(editPermId);
    if (!existingUserPerm2) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, true)").run(editPermId); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingSeePay = await db.prepare("SELECT id FROM permissions WHERE name = 'Ver Pagos'").get();
  let payPermId = existingSeePay ? existingSeePay.id : null;
  if (!payPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Ver Pagos', 'Permite ver los pagos registrados', true)").run();
    payPermId = res.lastInsertRowid;
  }
  if (payPermId) {
    const existingUserPerm3 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(payPermId);
    if (!existingUserPerm3) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, true)").run(payPermId); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingStatsFilterPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas: Filtros'").get();
  let statsFilterPermId = existingStatsFilterPerm ? existingStatsFilterPerm.id : null;
  if (!statsFilterPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Filtros', 'Permite filtrar las estadisticas', true)").run();
    statsFilterPermId = res.lastInsertRowid;
  }
  if (statsFilterPermId) {
    const existingUserPerm4 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statsFilterPermId);
    if (!existingUserPerm4) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, true)").run(statsFilterPermId); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingStatsTodayPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas: Hoy'").get();
  let statsTodayPermId = existingStatsTodayPerm ? existingStatsTodayPerm.id : null;
  if (!statsTodayPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Hoy', 'Permite ver solo las estadisticas de hoy', true)").run();
    statsTodayPermId = res.lastInsertRowid;
  }
  if (statsTodayPermId) {
    const existingUserPerm5 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statsTodayPermId);
    if (!existingUserPerm5) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, true)").run(statsTodayPermId); } catch (e) { if (e.code !== '23505') throw e; }
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

  // MIGRACION ACTIVE A BOOLEAN (para tablas existentes)
  const tablesWithActive = ['users', 'permissions', 'user_permissions', 'clients', 'products', 'product_templates', 'budgets', 'orders', 'simple_orders'];
  for (const table of tablesWithActive) {
    try {
      // Postgres requires USING clause to cast integer to boolean
      await client.query(`ALTER TABLE ${table} ALTER COLUMN active DROP DEFAULT`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN active TYPE BOOLEAN USING (active = 1)`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN active SET DEFAULT TRUE`);
    } catch(e) {
      if (e.code !== '42804' && e.code !== '42704') { // 42804 means already casted or incompatible, 42704 undefined object
         // ignore silently as they might already be boolean
      }
    }
  }
}

module.exports = { runMigrations };
