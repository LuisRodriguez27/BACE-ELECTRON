async function runMigrations(db, client) {
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
}

module.exports = { runMigrations };
