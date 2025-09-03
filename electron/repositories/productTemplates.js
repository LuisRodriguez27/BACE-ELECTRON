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
  final_price,
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
      product_id, final_price, width, height, colors, position, 
      texts, description, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    
  const result = stmt.run(
    product_id,
    final_price,
    width || null,
    height || null, 
    colors || null, 
    position || null,
    texts || null,
    description || null, 
    created_by
  );
  
  return getTemplateById(result.lastInsertRowid);
}

// ACTUALIZAR Y ELIMINAR

function updateTemplate(id, { 
  product_id, 
  final_price,
  width, 
  height, 
  colors, 
  position, 
  texts,
  description, 
}) {
  const stmt = db.prepare(`
    UPDATE product_templates 
    SET product_id = ?, final_price = ?, width = ?, height = ?, colors = ?, 
        position = ?, texts = ?, description = ?
    WHERE id = ?
  `);
  
  const result = stmt.run(
    product_id, 
    final_price,
    width || null, 
    height || null, 
    colors || null,
    position || null,
    texts || null,
    description || null, 
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
  
};