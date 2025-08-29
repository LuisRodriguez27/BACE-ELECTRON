const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
require("./db"); // asegura la creación de tablas

// Configuración
const saltRounds = 10;
const dbPath = path.join(__dirname, "../sqlite/data.db");
const db = new Database(dbPath);

function seed() {
  console.log("Inicializando base de datos...");

  // -------------------------
  // 1. Limpiar datos (en orden por FK)
  // -------------------------
  db.exec(`
    DELETE FROM user_permissions;
    DELETE FROM payments;
    DELETE FROM order_products;
    DELETE FROM orders;
    DELETE FROM product_templates;
    DELETE FROM products;
    DELETE FROM clients;
    DELETE FROM users;
    DELETE FROM permissions;
  `);

  // -------------------------
  // 2. Insertar usuario admin
  // -------------------------
  const passwordHash = bcrypt.hashSync("admin123", saltRounds);
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, active)
    VALUES (?, ?, ?)
  `);
  const adminInfo = insertUser.run("admin", passwordHash, 1);
  const adminId = adminInfo.lastInsertRowid;

  // -------------------------
  // 3. Insertar permisos
  // -------------------------
  const insertPermission = db.prepare(`
    INSERT INTO permissions (name, description, active)
    VALUES (?, ?, ?)
  `);

  const permissions = [
    ["manage_users", "Permite administrar usuarios", 1],
    ["manage_orders", "Permite gestionar órdenes", 1],
    ["manage_products", "Permite gestionar productos", 1],
    ["view_reports", "Permite visualizar reportes", 1],
  ];
  permissions.forEach((perm) => insertPermission.run(...perm));

  // -------------------------
  // 4. Asignar permisos al admin
  // -------------------------
  const allPermissions = db.prepare(`SELECT id FROM permissions`).all();
  const insertUserPermission = db.prepare(`
    INSERT INTO user_permissions (user_id, permission_id, active)
    VALUES (?, ?, ?)
  `);
  allPermissions.forEach((perm) => {
    insertUserPermission.run(adminId, perm.id, 1);
  });

  // -------------------------
  // 5. Insertar clientes
  // -------------------------
  const insertClient = db.prepare(`
    INSERT INTO clients (name, phone, address, description)
    VALUES (?, ?, ?, ?)
  `);
  const clients = [
    ["Cliente A", "555-1234", "Av. Siempre Viva 123", "Cliente frecuente"],
    ["Cliente B", "555-5678", "Calle Falsa 456", "Nuevo cliente"],
  ];
  clients.forEach((c) => insertClient.run(...c));

  // -------------------------
  // 6. Insertar productos (algunos simples, otros detallados)
  // -------------------------
  const insertProduct = db.prepare(`
    INSERT INTO products (name, serial_number, price, description, width, height, colors, position, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const products = [
    // Productos simples (sin detalles)
    ["Taza con diseño", "TZ-001", 40.0, "Taza personalizable básica", null, null, null, null, 1],
    ["Llavero básico", "LL-001", 15.0, "Llavero simple", null, null, null, null, 1],
    
    // Productos detallados (con especificaciones)
    ["Lona publicitaria", "LP-001", 120.0, "Lona resistente para exteriores", 2.0, 5.0, '["rojo", "blanco"]', "centro", 1],
    ["Banner vinílico", "BV-001", 85.0, "Banner para eventos", 1.5, 3.0, '["azul", "amarillo"]', "superior", 1],
    ["Cartel rígido", "CR-001", 200.0, "Cartel para stand", 1.0, 2.0, '["negro", "blanco"]', "centro", 1],
  ];
  
  const productIds = {};
  products.forEach((p) => {
    const result = insertProduct.run(...p);
    productIds[p[1]] = result.lastInsertRowid; // Guardar ID por serial_number
  });

  // -------------------------
  // 7. Crear plantillas de ejemplo
  // -------------------------
  const insertTemplate = db.prepare(`
    INSERT INTO product_templates (product_id, width, height, colors, position, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const templates = [
    // Plantilla para Lona publicitaria - "SE RENTA" roja
    [productIds["LP-001"], 2.5, 6.0, '["rojo", "blanco"]', "centro", "Lona SE RENTA roja 2.5x6", adminId],
    // Plantilla para Banner - "OFERTA" azul y amarillo
    [productIds["BV-001"], 1.0, 2.5, '["azul", "amarillo", "blanco"]', "superior", "Banner OFERTA promocional", adminId],
    // Plantilla para Cartel - "ABIERTO" verde
    [productIds["CR-001"], 0.8, 1.2, '["verde", "blanco"]', "centro", "Cartel ABIERTO negocio", adminId],
  ];
  
  const templateIds = {};
  templates.forEach((t, index) => {
    const result = insertTemplate.run(...t);
    templateIds[`template_${index + 1}`] = result.lastInsertRowid;
  });

  // -------------------------
  // 8. Insertar órdenes
  // -------------------------
  const clientA = db.prepare("SELECT id FROM clients WHERE name = ?").get("Cliente A").id;
  const clientB = db.prepare("SELECT id FROM clients WHERE name = ?").get("Cliente B").id;

  const insertOrder = db.prepare(`
    INSERT INTO orders (client_id, user_id, editated_by, date, estimated_delivery_date, status, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const order1 = insertOrder.run(
    clientA,
    adminId,
    adminId,
    new Date().toISOString(),
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 días
    "pendiente",
    165.0
  ).lastInsertRowid;

  const order2 = insertOrder.run(
    clientB,
    adminId,
    null,
    new Date().toISOString(),
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 días
    "completado",
    320.0
  ).lastInsertRowid;

  // -------------------------
  // 9. Insertar order_products (usando el nuevo sistema)
  // -------------------------
  const insertOrderProduct = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Orden 1 (Cliente A) - Productos mixtos: simples y con plantilla
  insertOrderProduct.run(order1, productIds["TZ-001"], null, 3, 40.0); // Taza simple, sin plantilla
  insertOrderProduct.run(order1, productIds["LP-001"], templateIds.template_1, 1, 125.0); // Lona con plantilla "SE RENTA"

  // Orden 2 (Cliente B) - Productos con plantillas modificadas
  insertOrderProduct.run(order2, productIds["BV-001"], templateIds.template_2, 2, 85.0); // Banner con plantilla "OFERTA"
  insertOrderProduct.run(order2, productIds["LL-001"], null, 10, 15.0); // Llaveros simples

  // -------------------------
  // 10. Insertar pagos
  // -------------------------
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, amount, date, descripcion)
    VALUES (?, ?, ?, ?)
  `);

  insertPayment.run(order1, 120.0, new Date().toISOString(), "Pago inicial de Cliente A");
  insertPayment.run(order1, 45.0, new Date().toISOString(), "Pago final de Cliente A");

  insertPayment.run(order2, 320.0, new Date().toISOString(), "Pago completo de Cliente B");

  console.log("Base de datos inicializada con datos de ejemplo");
  console.log("\n🎉 DATOS CREADOS:");
  console.log("\n👤 Usuario admin: admin / admin123");
  console.log("\n📦 Productos:");
  console.log("  - Productos simples: Taza, Llavero");
  console.log("  - Productos detallados: Lona, Banner, Cartel");
  console.log("\n📋 Plantillas:");
  console.log("  - Lona SE RENTA roja 2.5x6");
  console.log("  - Banner OFERTA promocional");
  console.log("  - Cartel ABIERTO negocio");
  console.log("\n📈 Órdenes:");
  console.log("  - Orden 1: 3 tazas + 1 lona (con plantilla)");
  console.log("  - Orden 2: 2 banners (con plantilla) + 10 llaveros");

}

seed();
db.close();
