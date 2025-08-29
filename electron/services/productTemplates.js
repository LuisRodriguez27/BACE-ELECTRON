const db = require('../db');

// ============================
// CRUD BÁSICO DE PLANTILLAS
// ============================

function getAllTemplates() {
  const stmt = db.prepare(`
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    ORDER BY pt.created_at DESC
  `);
  return stmt.all();
}

function getTemplateById(id) {
  const stmt = db.prepare(`
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.id = ?
  `);
  return stmt.get(id);
}

function getTemplatesByProductId(productId) {
  const stmt = db.prepare(`
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.product_id = ?
    ORDER BY pt.created_at DESC
  `);
  return stmt.all(productId);
}

function getTemplatesByUserId(userId) {
  const stmt = db.prepare(`
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.created_by = ?
    ORDER BY pt.created_at DESC
  `);
  return stmt.all(userId);
}

// ============================
// CREAR PLANTILLAS
// ============================

function createTemplate({ product_id, width, height, colors, position, description, created_by }) {
  const stmt = db.prepare(`
    INSERT INTO product_templates (product_id, width, height, colors, position, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convertir colors a string si es un objeto/array
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
  
  const result = stmt.run(product_id, width || null, height || null, colorsString, position || null, description, created_by);
  
  // Retornar la plantilla completa con joins
  return getTemplateById(result.lastInsertRowid);
}

// Crear plantilla desde un producto modificado en una orden
function createTemplateFromProductModification({ product_id, modifications, created_by, templateDescription }) {
  return createTemplate({
    product_id,
    width: modifications.width,
    height: modifications.height,
    colors: modifications.colors,
    position: modifications.position,
    description: templateDescription || 'Plantilla personalizada',
    created_by
  });
}

// ============================
// ACTUALIZAR Y ELIMINAR
// ============================

function updateTemplate(id, { product_id, width, height, colors, position, description }) {
  const stmt = db.prepare(`
    UPDATE product_templates 
    SET product_id = ?, width = ?, height = ?, colors = ?, position = ?, description = ?
    WHERE id = ?
  `);
  
  // Convertir colors a string si es un objeto/array
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
  
  const result = stmt.run(product_id, width || null, height || null, colorsString, position || null, description, id);
  
  if (result.changes > 0) {
    return { success: true, message: 'Plantilla actualizada exitosamente', data: getTemplateById(id) };
  } else {
    return { success: false, message: 'Plantilla no encontrada' };
  }
}

function deleteTemplate(id) {
  const stmt = db.prepare('DELETE FROM product_templates WHERE id = ?');
  const result = stmt.run(id);
  
  return result.changes > 0
    ? { success: true, message: 'Plantilla eliminada exitosamente' }
    : { success: false, message: 'Plantilla no encontrada' };
}

// ============================
// FUNCIONES AUXILIARES
// ============================

// Buscar plantillas similares (por dimensiones)
function findSimilarTemplates(product_id, width, height, tolerance = 0.1) {
  const stmt = db.prepare(`
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.product_id = ?
      AND ABS(pt.width - ?) <= ?
      AND ABS(pt.height - ?) <= ?
    ORDER BY pt.created_at DESC
  `);
  
  return stmt.all(product_id, width, tolerance, height, tolerance);
}

// Obtener estadísticas de uso de plantillas
function getTemplateUsageStats() {
  const stmt = db.prepare(`
    SELECT 
      pt.id,
      pt.description,
      p.name as product_name,
      COUNT(op.template_id) as usage_count,
      MAX(o.date) as last_used
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN order_products op ON pt.id = op.template_id
    LEFT JOIN orders o ON op.order_id = o.id
    GROUP BY pt.id
    ORDER BY usage_count DESC, pt.created_at DESC
  `);
  
  return stmt.all();
}

// Clonar una plantilla existente
function cloneTemplate(templateId, created_by, newDescription) {
  const original = getTemplateById(templateId);
  if (!original) {
    return { success: false, message: 'Plantilla original no encontrada' };
  }
  
  const cloned = createTemplate({
    product_id: original.product_id,
    width: original.width,
    height: original.height,
    colors: original.colors,
    position: original.position,
    description: newDescription || `Copia de: ${original.description}`,
    created_by: created_by
  });
  
  return { success: true, template: cloned };
}

module.exports = {
  // CRUD básico
  getAllTemplates,
  getTemplateById,
  getTemplatesByProductId,
  getTemplatesByUserId,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Funciones especiales
  createTemplateFromProductModification,
  findSimilarTemplates,
  getTemplateUsageStats,
  cloneTemplate
};
