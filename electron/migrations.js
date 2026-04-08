async function runMigrations(db, client) {
  // MIGRACION INICIAL (SI LA BD ESTÁ VACÍA)
  const userCount = await db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (userCount && parseInt(userCount.count) === 0) {
    const bcrypt = require("bcryptjs");
    const passwordHash = bcrypt.hashSync("admin123", 10);
    const adminRes = await db.prepare("INSERT INTO users (username, password, active) VALUES (?, ?, ?)").run("admin", passwordHash, 1);
    const adminId = adminRes.lastInsertRowid;

    const permissions = [
      // Usuarios y permisos
      ["Gestionar Usuario", "Permite crear, editar o desactivar usuarios", 1],
      ["Gestionar Permisos", "Permite asignar o revocar permisos a los usuarios", 1],

      // Clientes
      ["Crear Cliente", "Permite registrar nuevos clientes", 1],
      ["Editar Cliente", "Permite modificar datos de clientes", 1],
      ["Eliminar Cliente", "Permite eliminar o desactivar clientes", 1],

      // Productos
      ["Crear Producto", "Permite registrar nuevos productos", 1],
      ["Editar Producto", "Permite modificar información de productos", 1],
      ["Eliminar Producto", "Permite eliminar o desactivar productos", 1],

      // Plantillas de productos
      ["Crear Plantilla", "Permite crear plantillas de productos", 1],
      ["Editar Plantilla", "Permite modificar plantillas de productos", 1],
      ["Eliminar Plantilla", "Permite eliminar plantillas de productos", 1],

      // Órdenes
      ["Crear Órdenes", "Permite registrar nuevas órdenes", 1],
      ["Editar Órdenes", "Permite modificar órdenes", 1],
      ["Cancelar Órdenes", "Permite cancelar órdenes", 1],

      // Presupuestos
      ["Crear Presupuestos", "Permite registrar nuevos presupuestos", 1],
      ["Eliminar Presupuestos", "Permite eliminar presupuestos", 1],
      ["Editar Presupuestos", "Permite editar los presupuestos registrados", 1],

      // Pagos
      ["Ver pagos", "Permite ver los pagos registrados", 1],
      ["Registrar Pagos", "Permite registrar pagos en órdenes", 1],
      ["Eliminar Pagos", "Permite eliminar o anular pagos", 1],

      // Estadisticas
      ["Estadisticas", "Permite visualizar las estadisticas de ventas", 1],
    ];

    for (const perm of permissions) {
      try {
        await db.prepare("INSERT INTO permissions (name, description, active) VALUES (?, ?, ?)").run(...perm);
      } catch (e) {
        // Ignorar si ya existe
      }
    }

    const allPermissions = await db.prepare(`SELECT id FROM permissions`).all();
    for (const perm of allPermissions) {
      try {
        await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (?, ?, ?)").run(adminId, perm.id, 1);
      } catch (e) {
        // Ignorar si ya existe
      }
    }
    console.log("Migración inicial: Usuario admin y permisos creados automáticamente.");
  }

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

  const existingStatsFilterPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas: Filtros'").get();
  let statsFilterPermId = existingStatsFilterPerm ? existingStatsFilterPerm.id : null;
  if (!statsFilterPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Filtros', 'Permite filtrar las estadisticas', 1)").run();
    statsFilterPermId = res.lastInsertRowid;
  }
  if (statsFilterPermId) {
    const existingUserPerm4 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statsFilterPermId);
    if (!existingUserPerm4) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(statsFilterPermId); } catch (e) { }
    }
  }

  const existingStatsTodayPerm = await db.prepare("SELECT id FROM permissions WHERE name = 'Estadisticas: Hoy'").get();
  let statsTodayPermId = existingStatsTodayPerm ? existingStatsTodayPerm.id : null;
  if (!statsTodayPermId) {
    const res = await db.prepare("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Hoy', 'Permite ver solo las estadisticas de hoy', 1)").run();
    statsTodayPermId = res.lastInsertRowid;
  }
  if (statsTodayPermId) {
    const existingUserPerm5 = await db.prepare("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = ?").get(statsTodayPermId);
    if (!existingUserPerm5) {
      try { await db.prepare("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, ?, 1)").run(statsTodayPermId); } catch (e) { }
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
}

module.exports = { runMigrations };
