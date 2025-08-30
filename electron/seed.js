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
  // 5. Insertar más clientes realistas
  // -------------------------
  const insertClient = db.prepare(`
    INSERT INTO clients (name, phone, address, description)
    VALUES (?, ?, ?, ?)
  `);
  const clients = [
    ["Panadería San José", "951-123-4567", "Av. Hidalgo 123, Centro", "Cliente frecuente - Rótulos y banners"],
    ["Restaurant El Buen Sabor", "951-987-6543", "Calle Morelos 456, Col. Centro", "Cartas menú y lonas publicitarias"],
    ["Farmacia Santa María", "951-555-0123", "Av. Independencia 789", "Cliente corporativo - Señalización"],
    ["Taller Mecánico López", "951-444-7890", "Blvd. Eduardo Vasconcelos 321", "Letreros y promocionales"],
    ["Eventos Sociales Oaxaca", "951-333-2211", "Calle García Vigil 567", "Banners y lonas para eventos"]
  ];
  clients.forEach((c) => insertClient.run(...c));

  // -------------------------
  // 6. Insertar catálogo completo de productos
  // -------------------------
  const insertProduct = db.prepare(`
    INSERT INTO products (name, serial_number, price, description, width, height, colors, position, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const products = [
    // PRODUCTOS SIMPLES (sin especificaciones detalladas)
    ["Taza personalizada", "TZ-001", 45.0, "Taza cerámica sublimable 11oz", null, null, null, null, 1],
    ["Llavero acrílico", "LL-001", 18.0, "Llavero acrílico transparente", null, null, null, null, 1],
    ["Pluma promocional", "PL-001", 12.0, "Pluma con logo empresarial", null, null, null, null, 1],
    ["Gorra bordada", "GP-001", 85.0, "Gorra con bordado personalizado", null, null, null, null, 1],
    ["Playera estampada", "PY-001", 95.0, "Playera cotton con serigrafía", null, null, null, null, 1],
    
    // PRODUCTOS CON ESPECIFICACIONES (rotulación y publicidad exterior)
    ["Lona publicitaria", "LP-001", 130.0, "Lona vinilica resistente para exteriores", 2.0, 3.0, '["azul", "blanco", "rojo"]', "centro", 1],
    ["Banner promocional", "BP-001", 75.0, "Banner en lona para eventos", 1.0, 2.0, '["verde", "amarillo"]', "superior", 1],
    ["Cartel rígido", "CR-001", 180.0, "Cartel PVC espumado para stand", 0.8, 1.2, '["negro", "blanco"]', "centro", 1],
    ["Rótulo luminoso", "RL-001", 450.0, "Rótulo LED para fachada", 1.5, 0.6, '["blanco", "azul"]', "centro", 1],
    ["Volante promocional", "VP-001", 0.8, "Volante couche 150gr full color", 0.1, 0.15, '["multicolor"]', "completo", 1],
    ["Tarjeta de presentación", "TP-001", 2.5, "Tarjeta couche 300gr", 0.054, 0.085, '["negro", "dorado"]', "frontal", 1],
    ["Sticker vinilico", "ST-001", 25.0, "Sticker vinilo transparente", 0.1, 0.1, '["transparente"]', "contorno", 1],
    
    // PRODUCTOS ESPECIALIZADOS (gran formato)
    ["Espectacular", "ES-001", 1200.0, "Espectacular para carretera", 6.0, 4.0, '["multicolor"]', "completo", 1],
    ["Manta vinilica", "MV-001", 200.0, "Manta vinilica para fachada", 3.0, 2.0, '["rojo", "blanco"]', "centro", 1],
    ["Letrero acrílico", "LA-001", 320.0, "Letrero acrílico iluminado", 1.2, 0.4, '["transparente", "negro"]', "centro", 1],
  ];
  
  const productIds = {};
  products.forEach((p) => {
    const result = insertProduct.run(...p);
    productIds[p[1]] = result.lastInsertRowid; // Guardar ID por serial_number
  });

  // -------------------------
  // 7. Crear plantillas realistas de productos populares
  // -------------------------
  const insertTemplate = db.prepare(`
    INSERT INTO product_templates (product_id, width, height, colors, position, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const templates = [
    // Plantillas para Lona publicitaria
    [productIds["LP-001"], 2.5, 1.5, '["rojo", "blanco"]', "centro", "SE RENTA - Lona roja clásica", adminId],
    [productIds["LP-001"], 3.0, 2.0, '["azul", "blanco"]', "centro", "PROMOCIONES - Lona azul comercial", adminId],
    [productIds["LP-001"], 4.0, 2.5, '["verde", "amarillo", "blanco"]', "centro", "GRAN APERTURA - Lona festiva", adminId],
    
    // Plantillas para Banner promocional
    [productIds["BP-001"], 1.5, 1.0, '["naranja", "negro"]', "superior", "OFERTAS DEL MES - Banner llamativo", adminId],
    [productIds["BP-001"], 2.0, 0.8, '["morado", "dorado"]', "centro", "EVENTO ESPECIAL - Banner elegante", adminId],
    
    // Plantillas para Cartel rígido
    [productIds["CR-001"], 0.6, 0.9, '["blanco", "azul marino"]', "centro", "INFORMACIÓN - Cartel institucional", adminId],
    [productIds["CR-001"], 1.0, 0.7, '["amarillo", "negro"]', "superior", "PRECAUCIÓN - Cartel de seguridad", adminId],
    
    // Plantillas para productos promocionales
    [productIds["VP-001"], 0.1, 0.15, '["cyan", "magenta", "amarillo"]', "completo", "Volante promocional - Diseño vibrante", adminId],
    [productIds["TP-001"], 0.054, 0.085, '["negro", "plateado"]', "frontal", "Tarjeta ejecutiva - Diseño profesional", adminId],
    
    // Plantillas especializadas
    [productIds["MV-001"], 4.0, 3.0, '["rojo", "amarillo", "blanco"]', "centro", "Manta restaurante - Diseño gastronómico", adminId],
    [productIds["LA-001"], 1.5, 0.5, '["azul", "blanco"]', "centro", "Letrero farmacia - Diseño médico", adminId],
  ];
  
  const templateIds = {};
  templates.forEach((t, index) => {
    const result = insertTemplate.run(...t);
    templateIds[`template_${index + 1}`] = result.lastInsertRowid;
  });

  // -------------------------
  // 8. Insertar órdenes realistas con diferentes estados
  // -------------------------
  const panaderia = db.prepare("SELECT id FROM clients WHERE name = ?").get("Panadería San José").id;
  const restaurant = db.prepare("SELECT id FROM clients WHERE name = ?").get("Restaurant El Buen Sabor").id;
  const farmacia = db.prepare("SELECT id FROM clients WHERE name = ?").get("Farmacia Santa María").id;
  const taller = db.prepare("SELECT id FROM clients WHERE name = ?").get("Taller Mecánico López").id;
  const eventos = db.prepare("SELECT id FROM clients WHERE name = ?").get("Eventos Sociales Oaxaca").id;

  const insertOrder = db.prepare(`
    INSERT INTO orders (client_id, user_id, edited_by, date, estimated_delivery_date, status, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // ORDEN 1: Panadería - Orden completada (lona + tarjetas)
  const order1 = insertOrder.run(
    panaderia,
    adminId,
    null,
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // -7 días
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // -2 días
    "completado",
    380.0
  ).lastInsertRowid;

  // ORDEN 2: Restaurant - Orden en proceso (manta + volantes)
  const order2 = insertOrder.run(
    restaurant,
    adminId,
    adminId,
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // -3 días
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 días
    "en proceso",
    280.0
  ).lastInsertRowid;

  // ORDEN 3: Farmacia - Orden pendiente (letrero acrílico + cartel)
  const order3 = insertOrder.run(
    farmacia,
    adminId,
    null,
    new Date().toISOString(), // hoy
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 días
    "pendiente",
    500.0
  ).lastInsertRowid;

  // ORDEN 4: Eventos - Orden grande pendiente (banners múltiples)
  const order4 = insertOrder.run(
    eventos,
    adminId,
    null,
    new Date().toISOString(), // hoy
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
    "pendiente",
    450.0
  ).lastInsertRowid;

  // ORDEN 5: Taller - Orden cancelada (para mostrar historial)
  const order5 = insertOrder.run(
    taller,
    adminId,
    adminId,
    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // -10 días
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // -5 días
    "cancelado",
    150.0
  ).lastInsertRowid;

  // -------------------------
  // 9. Insertar productos de órdenes (realistas con plantillas)
  // -------------------------
  const insertOrderProduct = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  // ORDEN 1: Panadería - Lona SE RENTA + Tarjetas de presentación
  insertOrderProduct.run(order1, productIds["LP-001"], templateIds.template_1, 1, 130.0); // Lona SE RENTA
  insertOrderProduct.run(order1, productIds["TP-001"], templateIds.template_9, 100, 2.5); // 100 tarjetas

  // ORDEN 2: Restaurant - Manta de fachada + Volantes promocionales
  insertOrderProduct.run(order2, productIds["MV-001"], templateIds.template_11, 1, 200.0); // Manta restaurante
  insertOrderProduct.run(order2, productIds["VP-001"], templateIds.template_8, 100, 0.8); // 100 volantes

  // ORDEN 3: Farmacia - Letrero acrílico + Cartel informativo
  insertOrderProduct.run(order3, productIds["LA-001"], templateIds.template_12, 1, 320.0); // Letrero farmacia
  insertOrderProduct.run(order3, productIds["CR-001"], templateIds.template_6, 1, 180.0); // Cartel informativo

  // ORDEN 4: Eventos - Múltiples banners para evento
  insertOrderProduct.run(order4, productIds["BP-001"], templateIds.template_4, 3, 75.0); // 3 banners "OFERTAS"
  insertOrderProduct.run(order4, productIds["BP-001"], templateIds.template_5, 2, 75.0); // 2 banners "EVENTO ESPECIAL"

  // ORDEN 5: Taller - Productos promocionales (cancelada)
  insertOrderProduct.run(order5, productIds["TZ-001"], null, 2, 45.0); // 2 tazas simples
  insertOrderProduct.run(order5, productIds["LL-001"], null, 3, 18.0); // 3 llaveros simples
  insertOrderProduct.run(order5, productIds["PL-001"], null, 2, 12.0); // 2 plumas

  // -------------------------
  // 10. Insertar pagos realistas
  // -------------------------
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, amount, date, descripcion)
    VALUES (?, ?, ?, ?)
  `);

  // PAGOS ORDEN 1 (Panadería - Completada) - Pagos parciales
  insertPayment.run(order1, 200.0, new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), "Anticipo 50% - Panadería San José");
  insertPayment.run(order1, 180.0, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), "Pago final - Entrega completada");

  // PAGOS ORDEN 2 (Restaurant - En proceso) - Anticipo únicamente
  insertPayment.run(order2, 150.0, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), "Anticipo - Restaurant El Buen Sabor");

  // PAGOS ORDEN 3 (Farmacia - Pendiente) - Sin pagos aún
  // No hay pagos para esta orden

  // PAGOS ORDEN 4 (Eventos - Pendiente) - Anticipo pequeño
  insertPayment.run(order4, 100.0, new Date().toISOString(), "Seña - Eventos Sociales Oaxaca");

  // ORDEN 5 cancelada - sin pagos

  console.log("Base de datos inicializada con datos de ejemplo");
  console.log("\n🎉 DATOS CREADOS:");
  console.log("\n👤 Usuario admin: admin / admin123");
  console.log("\n🏢 CLIENTES:");
  console.log("  - Panadería San José (951-123-4567)");
  console.log("  - Restaurant El Buen Sabor (951-987-6543)");
  console.log("  - Farmacia Santa María (951-555-0123)");
  console.log("  - Taller Mecánico López (951-444-7890)");
  console.log("  - Eventos Sociales Oaxaca (951-333-2211)");
  console.log("\n📦 PRODUCTOS PRINCIPALES:");
  console.log("  - Productos promocionales: Tazas, Llaveros, Plumas, Gorras, Playeras");
  console.log("  - Rotulación: Lonas, Banners, Carteles, Rótulos LED");
  console.log("  - Impresos: Volantes, Tarjetas, Stickers");
  console.log("  - Gran formato: Espectaculares, Mantas, Letreros acrílicos");
  console.log("\n📋 PLANTILLAS (12 creadas):");
  console.log("  - SE RENTA, PROMOCIONES, GRAN APERTURA (lonas)");
  console.log("  - OFERTAS DEL MES, EVENTO ESPECIAL (banners)");
  console.log("  - INFORMACIÓN, PRECAUCIÓN (carteles)");
  console.log("  - Diseños especializados para restaurante y farmacia");
  console.log("\n📈 ÓRDENES:");
  console.log("  - Orden 1: Panadería (COMPLETADA) - Lona SE RENTA + Tarjetas");
  console.log("  - Orden 2: Restaurant (EN PROCESO) - Manta fachada + Volantes");
  console.log("  - Orden 3: Farmacia (PENDIENTE) - Letrero acrílico + Cartel");
  console.log("  - Orden 4: Eventos (PENDIENTE) - 5 Banners para evento");
  console.log("  - Orden 5: Taller (CANCELADA) - Productos promocionales");
  console.log("\n💰 PAGOS:");
  console.log("  - Panadería: $380.00 pagado completo (2 pagos)");
  console.log("  - Restaurant: $150.00 anticipo de $280.00 total");
  console.log("  - Farmacia: $0.00 de $500.00 total");
  console.log("  - Eventos: $100.00 seña de $450.00 total");
  console.log("\n✅ Base de datos lista para usar!");

}

seed();
db.close();
