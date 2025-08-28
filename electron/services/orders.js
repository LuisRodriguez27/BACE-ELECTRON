const db = require('../db');

function getAllOrders() {
	const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    ORDER BY o.date DESC
  `);
	return stmt.all();
}

function getOrderById(id) {
	const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    WHERE o.id = ?
  `).get(id);

	if (!stmt) return null;

	stmt.products = db.prepare(`
    SELECT op.*, p.name as product_name, p.serial_number
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    WHERE op.order_id = ?
  `).all(id);

	return stmt;
}

function getOrdersByClientId(clientId) {
  const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    WHERE o.client_id = ?
    ORDER BY o.date DESC
  `);
  return stmt.all(clientId);
}


// Estados válidos para las órdenes
const VALID_ORDER_STATUSES = ['pendiente', 'en proceso', 'completado', 'cancelado'];

// Función para validar estado de orden
function validateOrderStatus(status) {
  if (!status || !VALID_ORDER_STATUSES.includes(status)) {
    return 'pendiente'; // Estado por defecto
  }
  return status;
}

function createOrder({ client_id, user_id, date, estimated_delivery_date, status, total, products }) {
  // Validar estado antes de insertar
  const validatedStatus = validateOrderStatus(status);
  
  const stmt = db.prepare(`
    INSERT INTO orders (client_id, user_id, date, estimated_delivery_date, status, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(client_id, user_id, date, estimated_delivery_date, validatedStatus, total || 0);
  
  const orderId = result.lastInsertRowid;
  
  // Si hay productos, agregarlos a la orden
  if (products && products.length > 0) {
    const insertProductStmt = db.prepare(`
      INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertProducts = db.transaction((products) => {
      for (const product of products) {
        const colorsString = typeof product.colors === 'string' ? product.colors : JSON.stringify(product.colors || []);
        insertProductStmt.run(
          orderId,
          product.products_id,
          product.quantity,
          product.price,
          product.height || null,
          product.width || null,
          product.position || null,
          colorsString,
          product.description || null
        );
      }
    });
    
    insertProducts(products);
  }
  
  // Retornar la orden completa con joins
  return getOrderById(orderId);
}

function updateOrder(id, { client_id, user_id, estimated_delivery_date, status, total, editated_by }) {
	// Validar estado antes de actualizar (solo si se proporciona)
	const validatedStatus = status ? validateOrderStatus(status) : status;
	
	const stmt = db.prepare(`
		UPDATE orders
		SET client_id = ?, user_id = ?, estimated_delivery_date = ?, status = ?, total = ?, editated_by = ?
		WHERE id = ?
	`);
	const result = stmt.run(client_id, user_id, estimated_delivery_date, validatedStatus, total, editated_by, id);

	if (result.changes > 0) {
		return { success: true, message: 'Orden actualizada exitosamente', data: getOrderById(id) };
	} else {
		return { success: false, message: 'Orden no encontrada' };
	}
}

function deleteOrder(id) {
  // Primero eliminar productos asociados
  db.prepare('DELETE FROM order_products WHERE order_id = ?').run(id);
  // Luego eliminar la orden
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0
    ? { success: true, message: 'Orden eliminada exitosamente' }
    : { success: false, message: 'Orden no encontrada' };
}



// Funciones para agregar productos a una orden
// 1️⃣ Agregar un producto (ej: 1 toalla)
function addProductToOrder({ orderId, products_id, quantity, price, height, width, position, colors, description }) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || []);
  const result = stmt.run(orderId, products_id, quantity, price, height, width, position, colorsString, description);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid);
}

// 2️⃣ Agregar varios productos de una vez (ej: 35 toallas)
function addProductsToOrder({ orderId, products }) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, quantity, price, height, width, position, colors, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((products) => {
    for (const p of products) {
      const colorsString = typeof p.colors === 'string' ? p.colors : JSON.stringify(p.colors || []);
      stmt.run(orderId, p.products_id, p.quantity, p.price, p.height, p.width, p.position, colorsString, p.description);
    }
  });
  insertMany(products);
  return getProductsToOrder(orderId);
}

// 3️⃣ Editar cantidad (ej: cambiar 35 → 15)
function updateProductQuantity({ orderId, productId, newQuantity }) {
  db.prepare(`
    UPDATE order_products
    SET quantity = ?
    WHERE order_id = ? AND products_id = ?;
  `).run(newQuantity, orderId, productId);

  return db.prepare("SELECT * FROM order_products WHERE order_id = ? AND products_id = ?").get(orderId, productId);
}


// 4️⃣ Editar todos los datos de un producto dentro de una orden
function updateProductInOrder({ orderProductId, quantity, price, height, width, position, colors, description }) {
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || []);
  db.prepare(`
    UPDATE order_products 
    SET quantity = ?, price = ?, height = ?, width = ?, position = ?, colors = ?, description = ?
    WHERE id = ?
  `).run(quantity, price, height, width, position, colorsString, description, orderProductId);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
}

// 5️⃣ Eliminar un solo producto de la orden 
function removeProductFromOrder(orderProductId) {
  return db.prepare("DELETE FROM order_products WHERE id = ?").run(orderProductId);
}

// 6️⃣ Eliminar todos los productos de una orden
function clearProductsFromOrder(orderId) {
  return db.prepare("DELETE FROM order_products WHERE order_id = ?").run(orderId);
}

// 7️⃣ Obtener todos los productos de una orden
function getProductsToOrder(orderId) {
  return db.prepare(`
    SELECT op.*, p.name as product_name, p.serial_number
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    WHERE op.order_id = ?
  `).all(orderId);
}

module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByClientId,
  createOrder,
  updateOrder,
  deleteOrder,
  addProductToOrder,
  addProductsToOrder,
  updateProductQuantity,
  updateProductInOrder,
  removeProductFromOrder,
  clearProductsFromOrder,
  getProductsToOrder,
  VALID_ORDER_STATUSES,
  validateOrderStatus
};