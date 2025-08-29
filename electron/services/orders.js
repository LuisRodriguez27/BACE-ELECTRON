const db = require('../db');
const productTemplatesService = require('./productTemplates');

function getAllOrders() {
	const stmt = db.prepare(`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    WHERE o.status NOT IN ('completado', 'cancelado')
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

	// ✅ MODIFICADO: Incluir datos del producto base Y de la plantilla
	stmt.products = db.prepare(`
    SELECT 
      op.*,
      p.name as product_name, 
      p.serial_number,
      p.width as product_width,
      p.height as product_height,
      p.colors as product_colors,
      p.position as product_position,
      pt.width as template_width,
      pt.height as template_height,
      pt.colors as template_colors,
      pt.position as template_position,
      pt.description as template_description
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    LEFT JOIN product_templates pt ON op.template_id = pt.id
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

function getSales() {
  const stmt = db.prepare (`
    SELECT o.*, c.name as client_name, u.username as created_by, ue.username as edited_by
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN users ue ON o.editated_by = ue.id
    WHERE o.status = 'completado'
    ORDER BY o.date DESC
  `)

  return stmt.all();
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

// ✅ SIMPLIFICADO: Crear orden con productos usando el nuevo sistema
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
      INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertProducts = db.transaction((products) => {
      for (const product of products) {
        insertProductStmt.run(
          orderId,
          product.products_id,
          product.template_id || null,
          product.quantity,
          product.price
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

// ============================
// FUNCIONES PRINCIPALES DEL NUEVO FLUJO
// ============================

// 🎯 FLUJO 1: Agregar producto sin modificaciones (directo del producto base)
function addProductToOrder({ orderId, products_id, quantity, price }) {
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, products_id, null, quantity, price);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid);
}

// 🎯 FLUJO 2: Agregar producto CON modificaciones y opción de guardar como plantilla
function addProductWithModifications({ 
  orderId, 
  products_id, 
  quantity, 
  price, 
  modifications, 
  saveAsTemplate, 
  templateDescription,
  created_by 
}) {
  let template_id = null;
  
  // Si el usuario quiere guardar las modificaciones como plantilla
  if (saveAsTemplate && modifications) {
    const template = productTemplatesService.createTemplateFromProductModification({
      product_id: products_id,
      modifications,
      created_by,
      templateDescription: templateDescription || 'Plantilla personalizada'
    });
    template_id = template.id;
  }
  
  // Agregar producto a la orden
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, products_id, template_id, quantity, price);
  
  return { 
    success: true,
    orderProduct: db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid),
    templateCreated: template_id ? true : false,
    templateId: template_id
  };
}

// 🎯 FLUJO 3: Agregar producto desde plantilla existente
function addProductFromTemplate({ orderId, template_id, quantity, price }) {
  // Verificar que la plantilla existe y obtener el product_id
  const template = productTemplatesService.getTemplateById(template_id);
  if (!template) {
    return { success: false, message: 'Plantilla no encontrada' };
  }
  
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, template.product_id, template_id, quantity, price);
  
  return {
    success: true,
    orderProduct: db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid)
  };
}

// 🎯 FLUJO 4: Usar plantilla CON modificaciones adicionales
function addProductFromTemplateWithModifications({ 
  orderId, 
  template_id, 
  quantity, 
  price, 
  modifications, 
  saveModificationsAs, // 'none', 'update', 'new'
  newTemplateDescription,
  created_by 
}) {
  // Obtener plantilla original
  const originalTemplate = productTemplatesService.getTemplateById(template_id);
  if (!originalTemplate) {
    return { success: false, message: 'Plantilla original no encontrada' };
  }
  
  let finalTemplateId = template_id;
  
  if (modifications && saveModificationsAs !== 'none') {
    if (saveModificationsAs === 'update') {
      // Actualizar plantilla existente
      const mergedData = {
        product_id: originalTemplate.product_id,
        width: modifications.width !== undefined ? modifications.width : originalTemplate.width,
        height: modifications.height !== undefined ? modifications.height : originalTemplate.height,
        colors: modifications.colors !== undefined ? modifications.colors : originalTemplate.colors,
        position: modifications.position !== undefined ? modifications.position : originalTemplate.position,
        description: modifications.description !== undefined ? modifications.description : originalTemplate.description
      };
      
      productTemplatesService.updateTemplate(template_id, mergedData);
      
    } else if (saveModificationsAs === 'new') {
      // Crear nueva plantilla
      const newTemplate = productTemplatesService.createTemplateFromProductModification({
        product_id: originalTemplate.product_id,
        modifications: {
          width: modifications.width !== undefined ? modifications.width : originalTemplate.width,
          height: modifications.height !== undefined ? modifications.height : originalTemplate.height,
          colors: modifications.colors !== undefined ? modifications.colors : originalTemplate.colors,
          position: modifications.position !== undefined ? modifications.position : originalTemplate.position,
        },
        created_by,
        templateDescription: newTemplateDescription || `${originalTemplate.description} (modificada)`
      });
      finalTemplateId = newTemplate.id;
    }
  }
  
  // Agregar producto a la orden con la plantilla final
  const stmt = db.prepare(`
    INSERT INTO order_products (order_id, products_id, template_id, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(orderId, originalTemplate.product_id, finalTemplateId, quantity, price);
  
  return {
    success: true,
    orderProduct: db.prepare("SELECT * FROM order_products WHERE id = ?").get(result.lastInsertRowid),
    templateUsed: finalTemplateId,
    templateWasModified: saveModificationsAs !== 'none'
  };
}

// ============================
// FUNCIONES DE GESTIÓN DE PRODUCTOS EN ORDEN
// ============================

function updateProductQuantity({ orderProductId, newQuantity, newPrice }) {
  const updateFields = ['quantity = ?'];
  const updateValues = [newQuantity];
  
  if (newPrice !== undefined) {
    updateFields.push('price = ?');
    updateValues.push(newPrice);
  }
  
  updateValues.push(orderProductId);
  
  db.prepare(`
    UPDATE order_products
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...updateValues);

  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
}

function updateProductTemplate({ orderProductId, template_id }) {
  db.prepare(`
    UPDATE order_products 
    SET template_id = ?
    WHERE id = ?
  `).run(template_id || null, orderProductId);
  return db.prepare("SELECT * FROM order_products WHERE id = ?").get(orderProductId);
}

function removeProductFromOrder(orderProductId) {
  return db.prepare("DELETE FROM order_products WHERE id = ?").run(orderProductId);
}

function clearProductsFromOrder(orderId) {
  return db.prepare("DELETE FROM order_products WHERE order_id = ?").run(orderId);
}

// ✅ MODIFICADO: Obtener productos con toda la información necesaria
function getProductsToOrder(orderId) {
  return db.prepare(`
    SELECT 
      op.*,
      p.name as product_name, 
      p.serial_number,
      p.width as product_width,
      p.height as product_height,
      p.colors as product_colors,
      p.position as product_position,
      pt.width as template_width,
      pt.height as template_height,
      pt.colors as template_colors,
      pt.position as template_position,
      pt.description as template_description,
      pt.created_at as template_created_at
    FROM order_products op
    JOIN products p ON op.products_id = p.id
    LEFT JOIN product_templates pt ON op.template_id = pt.id
    WHERE op.order_id = ?
  `).all(orderId);
}

// ============================
// FUNCIONES DE CONSULTA Y ESTADÍSTICAS
// ============================

// Obtener órdenes que usan una plantilla específica
function getOrdersUsingTemplate(templateId) {
  return db.prepare(`
    SELECT DISTINCT o.*, c.name as client_name
    FROM orders o
    JOIN order_products op ON o.id = op.order_id
    JOIN clients c ON o.client_id = c.id
    WHERE op.template_id = ?
    ORDER BY o.date DESC
  `).all(templateId);
}

// Estadísticas de uso de plantillas en órdenes
function getTemplateUsageInOrders() {
  return db.prepare(`
    SELECT 
      pt.id as template_id,
      pt.description as template_description,
      p.name as product_name,
      COUNT(op.id) as usage_count,
      SUM(op.quantity) as total_quantity,
      AVG(op.price) as avg_price
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN order_products op ON pt.id = op.template_id
    GROUP BY pt.id
    HAVING usage_count > 0
    ORDER BY usage_count DESC
  `).all();
}

module.exports = {
  // Funciones básicas de órdenes
  getAllOrders,
  getOrderById,
  getOrdersByClientId,
  createOrder,
  updateOrder,
  deleteOrder,
  getSales,
  
  // Funciones del nuevo flujo de productos
  addProductToOrder,
  addProductWithModifications,
  addProductFromTemplate,
  addProductFromTemplateWithModifications,
  
  // Funciones de gestión de productos en orden
  updateProductQuantity,
  updateProductTemplate,
  removeProductFromOrder,
  clearProductsFromOrder,
  getProductsToOrder,
  
  // Funciones de consulta y estadísticas
  getOrdersUsingTemplate,
  getTemplateUsageInOrders,
  
  // Utilidades
  VALID_ORDER_STATUSES,
  validateOrderStatus
};