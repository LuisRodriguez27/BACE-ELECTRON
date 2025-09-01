const db = require('../db');

function getAllTemplates() {
  const stmt = db.prepare(`
    SELECT 
      pt.*,
      p.name as product_name, 
      p.serial_number,
      u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.active = 1
  `);
  return stmt.all();
}

function getTemplateById(id) {
  const stmt = db.prepare(`
    SELECT 
      pt.*,
      p.name as product_name, 
      p.serial_number, 
      p.price,
      u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.id = ? AND pt.active = 1
  `);
  return stmt.get(id);
}

function getTemplatesByProductId(productId) {
  const stmt = db.prepare(`
    SELECT 
      pt.*,
      p.name as product_name, 
      p.serial_number, 
      u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.product_id = ? AND pt.active = 1
  `);
  return stmt.all(productId);
}

// CREAR PLANTILLAS

function createTemplate({ 
  product_id, 
  width, 
  height, 
  colors, 
  position, 
  texts,
  description,
  created_by 
}) {
  const stmt = db.prepare(`
    INSERT INTO product_templates (
      product_id, width, height, colors, position, 
      texts, description, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Convertir objetos/arrays a JSON strings
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
  const textsString = typeof texts === 'string' ? texts : JSON.stringify(texts || null);
  
  const result = stmt.run(
    product_id, 
    width || null, 
    height || null, 
    colorsString, 
    position || null,
    textsString,
    description, 
    created_by
  );
  
  return getTemplateById(result.lastInsertRowid);
}

// ACTUALIZAR Y ELIMINAR

function updateTemplate(id, { 
  product_id, 
  width, 
  height, 
  colors, 
  position, 
  texts,
  description, 
}) {
  const stmt = db.prepare(`
    UPDATE product_templates 
    SET product_id = ?, width = ?, height = ?, colors = ?, 
        position = ?, texts = ?, description = ?
    WHERE id = ?
  `);
  
  // Convertir objetos/arrays a JSON strings
  const colorsString = typeof colors === 'string' ? colors : JSON.stringify(colors || null);
  const textsString = typeof texts === 'string' ? texts : JSON.stringify(texts || null);
  
  const result = stmt.run(
    product_id, 
    width || null, 
    height || null, 
    colorsString, 
    position || null,
    textsString,
    description, 
    id
  );
  
  if (result.changes > 0) {
    return { success: true, message: 'Plantilla actualizada exitosamente', data: getTemplateById(id) };
  } else {
    return { success: false, message: 'Plantilla no encontrada' };
  }
}

function deleteTemplate(id) {
  const stmt = db.prepare('UPDATE product_templates SET active = 0 WHERE id = ?');
  const result = stmt.run(id);
  
  return result.changes > 0
    ? { success: true, message: 'Plantilla eliminada exitosamente' }
    : { success: false, message: 'Plantilla no encontrada' };
}

// Buscar plantillas por texto
function searchTemplates(searchTerm) {
  const stmt = db.prepare(`
    SELECT 
      pt.*,
      p.name as product_name, 
      p.serial_number, 
      u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.description LIKE ? OR p.name LIKE ?
  `);
  
  const term = `%${searchTerm}%`;
  return stmt.all(term, term);
}

// Calcular precio final con modificadores
function calculateTemplatePrice(templateId, baseQuantity = 1) {
  const template = getTemplateById(templateId);
  if (!template) return null;
  
  const basePrice = template.base_price || 0;
  const modifier = template.price_modifier || 0;
  const finalUnitPrice = basePrice + modifier;
  
  return {
    base_price: basePrice,
    price_modifier: modifier,
    unit_price: finalUnitPrice,
    total_price: finalUnitPrice * baseQuantity,
  };
}

module.exports = {
  // CRUD básico
  getAllTemplates,
  getTemplateById,
  getTemplatesByProductId,
  createTemplate,
  updateTemplate,
  deleteTemplate,
    
  // Búsqueda y filtrado
  searchTemplates,
  
  // Utilidades
  calculateTemplatePrice
};