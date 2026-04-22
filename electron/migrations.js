async function runMigrations(db, client) {
  // MIGRACION INICIAL (SI LA BD ESTÁ VACÍA)
  const userCount = await db.getOne("SELECT COUNT(*) as count FROM users");
  if (userCount && parseInt(userCount.count) === 0) {
    const bcrypt = require("bcryptjs");
    const passwordHash = bcrypt.hashSync("admin123", 10);
    const adminRes = await db.execute("INSERT INTO users (username, password, active) VALUES ($1, $2, $3)", ["admin", passwordHash, true]);
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
        await db.execute("INSERT INTO permissions (name, description, active) VALUES ($1, $2, $3)", perm);
      } catch (e) {
        if (e.code !== '23505') throw e; // Solo ignorar si es violación de unicidad
      }
    }

    const allPermissions = await db.getAll(`SELECT id FROM permissions`);
    for (const perm of allPermissions) {
      try {
        await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES ($1, $2, $3)", [adminId, perm.id, true]);
      } catch (e) {
        if (e.code !== '23505') throw e; // Solo ignorar si es llave duplicada
      }
    }
    console.log("Migración inicial: Usuario admin y permisos creados automáticamente.");
  }

  // MIGRACION ESTADISTICAS Y PRESUPUESTOS
  const existingStatPerm = await db.getOne("SELECT id FROM permissions WHERE name = 'Estadisticas'");
  let statPermId = existingStatPerm ? existingStatPerm.id : null;
  if (!statPermId) {
    const res = await db.execute("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas', 'Permite visualizar las estadisticas de ventas', true)");
    statPermId = res.lastInsertRowid;
  }
  if (statPermId) {
    const existingUserPerm = await db.getOne("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [statPermId]);
    if (!existingUserPerm) {
      try { await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, true)", [statPermId]); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingEditPerm = await db.getOne("SELECT id FROM permissions WHERE name = 'Editar Presupuestos'");
  let editPermId = existingEditPerm ? existingEditPerm.id : null;
  if (!editPermId) {
    const res = await db.execute("INSERT INTO permissions (name, description, active) VALUES ('Editar Presupuestos', 'Permite editar los presupuestos registrados', true)");
    editPermId = res.lastInsertRowid;
  }
  if (editPermId) {
    const existingUserPerm2 = await db.getOne("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [editPermId]);
    if (!existingUserPerm2) {
      try { await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, true)", [editPermId]); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingSeePay = await db.getOne("SELECT id FROM permissions WHERE name = 'Ver Pagos'");
  let payPermId = existingSeePay ? existingSeePay.id : null;
  if (!payPermId) {
    const res = await db.execute("INSERT INTO permissions (name, description, active) VALUES ('Ver Pagos', 'Permite ver los pagos registrados', true)");
    payPermId = res.lastInsertRowid;
  }
  if (payPermId) {
    const existingUserPerm3 = await db.getOne("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [payPermId]);
    if (!existingUserPerm3) {
      try { await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, true)", [payPermId]); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingStatsFilterPerm = await db.getOne("SELECT id FROM permissions WHERE name = 'Estadisticas: Filtros'");
  let statsFilterPermId = existingStatsFilterPerm ? existingStatsFilterPerm.id : null;
  if (!statsFilterPermId) {
    const res = await db.execute("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Filtros', 'Permite filtrar las estadisticas', true)");
    statsFilterPermId = res.lastInsertRowid;
  }
  if (statsFilterPermId) {
    const existingUserPerm4 = await db.getOne("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [statsFilterPermId]);
    if (!existingUserPerm4) {
      try { await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, true)", [statsFilterPermId]); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  const existingStatsTodayPerm = await db.getOne("SELECT id FROM permissions WHERE name = 'Estadisticas: Hoy'");
  let statsTodayPermId = existingStatsTodayPerm ? existingStatsTodayPerm.id : null;
  if (!statsTodayPermId) {
    const res = await db.execute("INSERT INTO permissions (name, description, active) VALUES ('Estadisticas: Hoy', 'Permite ver solo las estadisticas de hoy', true)");
    statsTodayPermId = res.lastInsertRowid;
  }
  if (statsTodayPermId) {
    const existingUserPerm5 = await db.getOne("SELECT * FROM user_permissions WHERE user_id = 1 AND permission_id = $1", [statsTodayPermId]);
    if (!existingUserPerm5) {
      try { await db.execute("INSERT INTO user_permissions (user_id, permission_id, active) VALUES (1, $1, true)", [statsTodayPermId]); } catch (e) { if (e.code !== '23505') throw e; }
    }
  }

  // ACTUALIZACION DE ESTADOS
  await db.execute("UPDATE orders SET status = 'Revision' WHERE status = 'pendiente'");
  await db.execute("UPDATE orders SET status = 'Produccion' WHERE status = 'en proceso'");
  await db.execute("UPDATE orders SET status = 'Completado' WHERE status = 'completado'");
  await db.execute("UPDATE orders SET status = 'Cancelado' WHERE status = 'cancelado'");

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
  const checkOrderCount = await db.getOne('SELECT COUNT(*) as count, MAX(id) as maxId FROM orders');
  if (checkOrderCount && (checkOrderCount.count === '0' || (checkOrderCount.maxid && parseInt(checkOrderCount.maxid) < 14549))) {
    await client.query("SELECT setval('orders_id_seq', 14549, false)");
  }

  // MIGRACION ACTIVE A BOOLEAN (para tablas existentes)
  // Verifica el tipo de columna antes de intentar convertir para evitar errores.
  const tablesWithActive = ['users', 'permissions', 'user_permissions', 'clients', 'products', 'product_templates', 'budgets', 'orders', 'simple_orders'];
  for (const table of tablesWithActive) {
    try {
      // Verificar si la columna aún es INTEGER (no BOOLEAN)
      const colInfo = await client.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = 'active'`,
        [table]
      );

      if (colInfo.rows.length > 0 && colInfo.rows[0].data_type !== 'boolean') {
        // Solo convertir si no es boolean todavía
        await client.query(`ALTER TABLE ${table} ALTER COLUMN active DROP DEFAULT`);
        await client.query(`ALTER TABLE ${table} ALTER COLUMN active TYPE BOOLEAN USING (active = 1)`);
      }

      // Siempre asegurar que el DEFAULT TRUE esté presente
      await client.query(`ALTER TABLE ${table} ALTER COLUMN active SET DEFAULT TRUE`);
    } catch(e) {
      console.log(`Aviso: Error en migración active de ${table}:`, e.message);
    }
  }

  // ============================================================
  // MIGRACIÓN: ÍNDICES PARA LLAVES FORÁNEAS
  // PostgreSQL NO crea índices automáticos para FKs.
  // Sin estos índices, cualquier JOIN o lookup por FK hace
  // un Full Table Scan, lo que degrada el rendimiento gravemente
  // cuando la tabla crece (miles de registros).
  // ============================================================
  const fkIndexes = [
    // user_permissions
    `CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id       ON user_permissions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id)`,
    // product_templates
    `CREATE INDEX IF NOT EXISTS idx_product_templates_product_id   ON product_templates(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_product_templates_created_by   ON product_templates(created_by)`,
    // budgets
    `CREATE INDEX IF NOT EXISTS idx_budgets_client_id              ON budgets(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_user_id                ON budgets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_edited_by              ON budgets(edited_by)`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_converted_to_order_id  ON budgets(converted_to_order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_active                 ON budgets(active)`,
    // orders
    `CREATE INDEX IF NOT EXISTS idx_orders_client_id               ON orders(client_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_user_id                 ON orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_edited_by               ON orders(edited_by)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_from_budget_id  ON orders(created_from_budget_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status                  ON orders(status)`,
    // order_products
    `CREATE INDEX IF NOT EXISTS idx_order_products_order_id        ON order_products(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_order_products_product_id      ON order_products(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_order_products_template_id     ON order_products(template_id)`,
    // budget_products
    `CREATE INDEX IF NOT EXISTS idx_budget_products_budget_id      ON budget_products(budget_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budget_products_product_id     ON budget_products(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budget_products_template_id    ON budget_products(template_id)`,
    // payments
    `CREATE INDEX IF NOT EXISTS idx_payments_order_id              ON payments(order_id)`,
    // products
    `CREATE INDEX IF NOT EXISTS idx_products_active                ON products(active)`,
    // simple_orders
    `CREATE INDEX IF NOT EXISTS idx_simple_orders_user_id          ON simple_orders(user_id)`,
    // simple_order_payments
    `CREATE INDEX IF NOT EXISTS idx_simple_order_payments_simple_order_id ON simple_order_payments(simple_order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_simple_order_payments_user_id         ON simple_order_payments(user_id)`,
  ];
  for (const sql of fkIndexes) {
    try {
      await client.query(sql);
    } catch (e) {
      console.log(`Aviso: No se pudo crear índice FK: ${e.message}`);
    }
  }
  console.log("✅ Migración índices FK: completada.");
}

module.exports = { runMigrations };
