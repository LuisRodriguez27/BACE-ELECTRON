const db = require('../db');
const ProductTemplate = require('../domain/productTemplate');

class ProductTemplateRepository {

  findAll() {
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
      ORDER BY pt.id DESC
    `);
    
    const templates = stmt.all();
    return templates.map(template => new ProductTemplate(template));
  }

  findById(id) {
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
    
    const template = stmt.get(id);
    if (!template) return null;
    
    return new ProductTemplate(template);
  }

  findByProductId(productId) {
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
      ORDER BY pt.id DESC
    `);
    
    const templates = stmt.all(productId);
    return templates.map(template => new ProductTemplate(template));
  }

  create(templateData) {
    const stmt = db.prepare(`
      INSERT INTO product_templates (
        product_id, final_price, width, height, colors, position, 
        texts, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      templateData.product_id,
      templateData.final_price,
      templateData.width || null,
      templateData.height || null,
      templateData.colors || null,
      templateData.position || null,
      templateData.texts || null,
      templateData.description || null,
      templateData.created_by || null
    );
    
    return this.findById(result.lastInsertRowid);
  }

  update(id, templateData) {
    const stmt = db.prepare(`
      UPDATE product_templates 
      SET product_id = ?, final_price = ?, width = ?, height = ?, colors = ?, 
          position = ?, texts = ?, description = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      templateData.product_id,
      templateData.final_price,
      templateData.width || null,
      templateData.height || null,
      templateData.colors || null,
      templateData.position || null,
      templateData.texts || null,
      templateData.description || null,
      id
    );
    
    return result.changes > 0;
  }

  delete(id) {
    const stmt = db.prepare('UPDATE product_templates SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  // Búsqueda avanzada
  searchByTerm(searchTerm) {
    const stmt = db.prepare(`
      SELECT 
        pt.*,
        p.name as product_name, 
        p.serial_number, 
        u.username as created_by_username
      FROM product_templates pt
      JOIN products p ON pt.product_id = p.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.active = 1 AND (
        pt.description LIKE ? OR 
        p.name LIKE ? OR 
        p.serial_number LIKE ? OR
        pt.position LIKE ? OR
        pt.texts LIKE ? OR
        u.username LIKE ?
      )
      ORDER BY pt.id DESC
    `);
    
    const term = `%${searchTerm}%`;
    const templates = stmt.all(term, term, term, term, term, term);
    return templates.map(template => new ProductTemplate(template));
  }
}

module.exports = new ProductTemplateRepository();
