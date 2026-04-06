const db = require('../db');
const ProductTemplate = require('../domain/productTemplate');

class ProductTemplateRepository {

  async findAll() {
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

    const templates = await stmt.all();
    return templates.map(template => new ProductTemplate(template));
  }

  async findById(id) {
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

    const template = await stmt.get(id);
    if (!template) return null;

    return new ProductTemplate(template);
  }

  async findByProductId(productId) {
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

    const templates = await stmt.all(productId);
    return templates.map(template => new ProductTemplate(template));
  }

  async create(templateData) {
    const stmt = db.prepare(`
      INSERT INTO product_templates (
        product_id, final_price, promo_price, discount_price, width, height, colors, position, 
        texts, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      templateData.product_id,
      templateData.final_price,
      templateData.promo_price !== undefined ? templateData.promo_price : null,
      templateData.discount_price !== undefined ? templateData.discount_price : null,
      templateData.width || null,
      templateData.height || null,
      templateData.colors || null,
      templateData.position || null,
      templateData.texts || null,
      templateData.description || null,
      templateData.created_by || null
    );

    return await this.findById(result.lastInsertRowid);
  }

  async update(id, templateData) {
    const stmt = db.prepare(`
      UPDATE product_templates 
      SET product_id = ?, final_price = ?, promo_price = ?, discount_price = ?, width = ?, height = ?, colors = ?, 
          position = ?, texts = ?, description = ?
      WHERE id = ?
    `);

    const result = await stmt.run(
      templateData.product_id,
      templateData.final_price,
      templateData.promo_price !== undefined ? templateData.promo_price : null,
      templateData.discount_price !== undefined ? templateData.discount_price : null,
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

  async delete(id) {
    const stmt = db.prepare('UPDATE product_templates SET active = 0 WHERE id = ?');
    const result = await stmt.run(id);

    return result.changes > 0;
  }

  // Búsqueda avanzada
  async searchByTerm(searchTerm) {
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
        pt.description ILIKE ? OR 
        p.name ILIKE ? OR 
        p.serial_number ILIKE ? OR
        pt.position ILIKE ? OR
        pt.texts ILIKE ? OR
        u.username ILIKE ?
      )
      ORDER BY pt.id DESC
    `);

    const term = `%${searchTerm}%`;
    const templates = await stmt.all(term, term, term, term, term, term);
    return templates.map(template => new ProductTemplate(template));
  }
}

module.exports = new ProductTemplateRepository();
