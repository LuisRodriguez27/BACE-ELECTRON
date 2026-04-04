const path = require("path");
const bcrypt = require("bcryptjs");
const { log } = require("console");
const db = require("./db"); // asegura la creación de tablas

// Configuración
const saltRounds = 10;

async function seed() {
  console.log("Inicializando base de datos...");

  // -------------------------
  // 1. Limpiar datos (en orden por FK)
  // -------------------------
  await db.exec(`
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
  const adminInfo = await insertUser.run("admin", passwordHash, 1);
  const adminId = adminInfo.lastInsertRowid;

  const passwordHash2 = bcrypt.hashSync("user123", saltRounds);
  const insertUser2 = db.prepare(`
    INSERT INTO users (username, password, active)
    VALUES (?, ?, ?)
  `);
  const userInfo = await insertUser2.run("user", passwordHash2, 1);
  const userId = userInfo.lastInsertRowid;

  // -------------------------
  // 3. Insertar permisos
  // -------------------------
  const insertPermission = db.prepare(`
    INSERT INTO permissions (name, description, active)
    VALUES (?, ?, ?)
  `);

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

  // Pagos
  ["Registrar Pagos", "Permite registrar pagos en órdenes", 1],
  ["Eliminar Pagos", "Permite eliminar o anular pagos", 1],
  ];
  for (const perm of permissions) {
    await insertPermission.run(...perm);
  }

  // -------------------------
  // 4. Asignar permisos al admin
  // -------------------------
  const allPermissions = await db.prepare(`SELECT id FROM permissions`).all();
  const insertUserPermission = db.prepare(`
    INSERT INTO user_permissions (user_id, permission_id, active)
    VALUES (?, ?, ?)
  `);
  for (const perm of allPermissions) {
    await insertUserPermission.run(adminId, perm.id, 1);
  }

  // Asignar algunos permisos al usuario normal
  const userPermissions = await db.prepare(`
    SELECT id FROM permissions WHERE name IN (?)
  `).all("Crear Cliente");
  for (const perm of userPermissions) {
    await insertUserPermission.run(userId, perm.id, 1);
  }

  // -------------------------
  // 5. Insertar clientes
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
  for (const c of clients) {
    await insertClient.run(...c);
  }

  // -------------------------
  // 6. Insertar productos (simplificado al esquema actual)
  // -------------------------
  const insertProduct = db.prepare(`
    INSERT INTO products (name, serial_number, price, description, active)
    VALUES (?, ?, ?, ?, ?)
  `);

  const products = [
    ["Taza personalizada", "TZ-001", 45.0, "Taza cerámica sublimable 11oz", 1],
    ["Llavero acrílico", "LL-001", 18.0, "Llavero acrílico transparente", 1],
    ["Pluma promocional", "PL-001", 12.0, "Pluma con logo empresarial", 1],
    ["Gorra bordada", "GP-001", 85.0, "Gorra con bordado personalizado", 1],
    ["Playera estampada", "PY-001", 95.0, "Playera cotton con serigrafía", 1],
    ["Lona publicitaria", "LP-001", 130.0, "Lona vinílica resistente para exteriores", 1],
    ["Banner promocional", "BP-001", 75.0, "Banner en lona para eventos", 1],
    ["Cartel rígido", "CR-001", 180.0, "Cartel PVC espumado para stand", 1],
    ["Rótulo luminoso", "RL-001", 450.0, "Rótulo LED para fachada", 1],
    ["Volante promocional", "VP-001", 0.8, "Volante couche 150gr full color", 1],
    ["Tarjeta de presentación", "TP-001", 2.5, "Tarjeta couche 300gr", 1],
    ["Sticker vinílico", "ST-001", 25.0, "Sticker vinilo transparente", 1],
    ["Espectacular", "ES-001", 1200.0, "Espectacular para carretera", 1],
    ["Manta vinílica", "MV-001", 200.0, "Manta vinílica para fachada", 1],
    ["Letrero acrílico", "LA-001", 320.0, "Letrero acrílico iluminado", 1],
  ];

  const productIds = {};
  for (const p of products) {
    const result = await insertProduct.run(...p);
    productIds[p[1]] = result.lastInsertRowid;
  }

  // -------------------------
  // 7. Insertar plantillas de productos
  // -------------------------
  const insertTemplate = db.prepare(`
    INSERT INTO product_templates 
    (product_id, final_price, width, height, colors, position, texts, description, created_by, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const templates = [
    [productIds["TZ-001"], 60.0, 9.5, 8.0, "blanco, rojo", "frente", "Feliz Cumpleaños", "Taza personalizada con frase", adminId, 1],
    [productIds["GP-001"], 100.0, null, null, "azul, negro", "frente", "Logo empresa", "Gorra con logo bordado", adminId, 1],
    [productIds["PY-001"], 120.0, null, null, "rojo, blanco", "frente", "Texto promocional", "Playera con texto publicitario", adminId, 1],
    [productIds["LP-001"], 150.0, 200.0, 100.0, "full color", "horizontal", "Gran apertura", "Lona publicitaria con diseño", adminId, 1],
    [productIds["VP-001"], 1.2, 10.0, 20.0, "full color", "frente", "Descuento especial", "Volante con promoción", adminId, 1],
  ];

  const templateIds = {};
  for (let i = 0; i < templates.length; i++) {
    const result = await insertTemplate.run(...templates[i]);
    templateIds[`TEMPLATE-${i + 1}`] = result.lastInsertRowid;
  }

  // -------------------------
  // 8. Insertar órdenes
  // -------------------------
  const insertOrder = db.prepare(`
    INSERT INTO orders (client_id, user_id, edited_by, date, estimated_delivery_date, status, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const panaderia = (await db.prepare("SELECT id FROM clients WHERE name = ?").get("Panadería San José")).id;
  const restaurant = (await db.prepare("SELECT id FROM clients WHERE name = ?").get("Restaurant El Buen Sabor")).id;
  const farmacia = (await db.prepare("SELECT id FROM clients WHERE name = ?").get("Farmacia Santa María")).id;
  const taller = (await db.prepare("SELECT id FROM clients WHERE name = ?").get("Taller Mecánico López")).id;
  const eventos = (await db.prepare("SELECT id FROM clients WHERE name = ?").get("Eventos Sociales Oaxaca")).id;

  // Función para generar descripción aleatoria
  function generateRandomDescription() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    const length = Math.floor(Math.random() * 50) + 20; // Entre 20 y 70 caracteres
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.trim();
  }

  // Crear 30 órdenes completadas
  const orderIds = [];
  const clientIds = [panaderia, restaurant, farmacia, taller, eventos];
  const totals = [200.0, 300.0, 150.0, 400.0, 250.0, 350.0, 180.0, 450.0, 280.0, 320.0];

  for (let i = 1; i <= 30; i++) {
    const clientId = clientIds[i % clientIds.length];
    const total = totals[i % totals.length];
    const daysAgo = Math.floor(Math.random() * 90); // Órdenes de los últimos 90 días
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const deliveryDate = new Date(orderDate.getTime() + (3 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000);
    const notes = generateRandomDescription();
    const description = generateRandomDescription();

    const orderResult = await insertOrder.run(
      clientId,
      adminId,
      adminId,
      orderDate.toISOString(),
      deliveryDate.toISOString(),
      "completado",
      total,
      notes
    );

    orderIds.push(orderResult.lastInsertRowid);
  }

  // -------------------------
  // 9. Insertar productos de órdenes
  // -------------------------
  const insertOrderProduct = db.prepare(`
    INSERT INTO order_products (order_id, product_id, template_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Productos disponibles para asignar a las órdenes
  const availableProducts = [
    { id: productIds["LP-001"], price: 130.0 },
    { id: productIds["TP-001"], price: 2.5 },
    { id: productIds["MV-001"], price: 200.0 },
    { id: productIds["VP-001"], price: 0.8 },
    { id: productIds["TZ-001"], price: 45.0 },
    { id: productIds["GP-001"], price: 85.0 },
    { id: productIds["PY-001"], price: 95.0 },
    { id: productIds["BP-001"], price: 75.0 }
  ];

  // Asignar productos a cada orden
  for (const orderId of orderIds) {
    const numProducts = Math.floor(Math.random() * 3) + 1; // 1-3 productos por orden
    
    for (let j = 0; j < numProducts; j++) {
      const product = availableProducts[j % availableProducts.length];
      const quantity = Math.floor(Math.random() * 50) + 1; // 1-50 cantidad
      const totalPrice = product.price * quantity;
      
      await insertOrderProduct.run(orderId, product.id, null, quantity, product.price, totalPrice);
    }
  }

  // -------------------------
  // 10. Insertar pagos
  // -------------------------
  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, amount, date, descripcion)
    VALUES (?, ?, ?, ?)
  `);

  // Agregar pagos para algunas órdenes (aproximadamente 70% de las órdenes tendrán pagos)
  for (const orderId of orderIds) {
    if (Math.random() < 0.7) { // 70% de probabilidad de tener pago
      const paymentAmount = Math.floor(Math.random() * 300) + 50; // Entre 50 y 350
      const paymentDate = new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000);
      const descriptions = ["Anticipo", "Pago completo", "Pago parcial", "Liquidación"];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      await insertPayment.run(orderId, paymentAmount, paymentDate.toISOString(), description);
    }
  }

  // -------------------------
  // 12. Insertar 3 presupuestos de ejemplo
  // -------------------------
  const insertBudget = db.prepare(`
    INSERT INTO budgets (client_id, user_id, date, total)
    VALUES (?, ?, ?, ?)
  `);

  const insertBudgetProduct = db.prepare(`
    INSERT INTO budget_products (budget_id, product_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Presupuesto 1 - Panadería
  const budget1 = await insertBudget.run(panaderia, adminId, new Date().toISOString(), 195.0);
  await insertBudgetProduct.run(budget1.lastInsertRowid, productIds["LP-001"], 1, 130.0, 130.0);
  await insertBudgetProduct.run(budget1.lastInsertRowid, productIds["TP-001"], 26, 2.5, 65.0);

  // Presupuesto 2 - Restaurant
  const budget2 = await insertBudget.run(restaurant, adminId, new Date().toISOString(), 320.0);
  await insertBudgetProduct.run(budget2.lastInsertRowid, productIds["MV-001"], 1, 200.0, 200.0);
  await insertBudgetProduct.run(budget2.lastInsertRowid, productIds["VP-001"], 150, 0.8, 120.0);

  // Presupuesto 3 - Farmacia
  const budget3 = await insertBudget.run(farmacia, adminId, new Date().toISOString(), 240.0);
  await insertBudgetProduct.run(budget3.lastInsertRowid, productIds["RL-001"], 1, 450.0, 450.0);

  console.log("Base de datos inicializada con datos de ejemplo");
  console.log("Usuario admin: admin / admin123");
  console.log("Fin del seed");
  
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error("Error al poblar BD:", err);
  process.exit(1);
});
