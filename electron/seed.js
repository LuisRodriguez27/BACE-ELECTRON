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
  // 6. Insertar productos
  // -------------------------
  const insertProduct = db.prepare(`
    INSERT INTO products (name, serial_number, price, description, active)
    VALUES (?, ?, ?, ?, ?)
  `);
  const products = [
    ["Producto 1", "SN-001", 100.0, "Descripción producto 1", 1],
    ["Producto 2", "SN-002", 250.5, "Descripción producto 2", 1],
    ["Producto 3", "SN-003", 500.0, "Descripción producto 3", 1],
  ];
  products.forEach((p) => insertProduct.run(...p));

  // -------------------------
  // 7. Insertar órdenes
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
    350.5
  ).lastInsertRowid;

  const order2 = insertOrder.run(
    clientB,
    adminId,
    null,
    new Date().toISOString(),
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 días
    "completado",
    500.0
  ).lastInsertRowid;

  // -------------------------
  // 8. Insertar order_products
  // -------------------------
  const product1 = db.prepare("SELECT id FROM products WHERE serial_number = ?").get("SN-001").id;
  const product2 = db.prepare("SELECT id FROM products WHERE serial_number = ?").get("SN-002").id;
  const product3 = db.prepare("SELECT id FROM products WHERE serial_number = ?").get("SN-003").id;

  const insertOrderProduct = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrderProduct.run(order1, product1, 2, 100.0, 10, 20, "Frente", "Rojo, Azul", "Detalles personalizados");
  insertOrderProduct.run(order1, product2, 1, 250.5, 15, 30, "Lateral", "Verde", "Con grabado");

  insertOrderProduct.run(order2, product3, 1, 500.0, 50, 50, "Superior", "Negro", "Entrega rápida");

  // -------------------------
  // 9. Insertar pagos
  // -------------------------
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, amount, date, descripcion)
    VALUES (?, ?, ?, ?)
  `);

  insertPayment.run(order1, 200.0, new Date().toISOString(), "Pago inicial de Cliente A");
  insertPayment.run(order1, 150.5, new Date().toISOString(), "Pago final de Cliente A");

  insertPayment.run(order2, 500.0, new Date().toISOString(), "Pago completo de Cliente B");

  console.log("Base de datos inicializada con datos de ejemplo");

}

seed();
db.close();
