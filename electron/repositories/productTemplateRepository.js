const db = require('../db');
const ProductTemplate = require('../domain/productTemplate');

class ProductTemplateRepository {

  async findAll() {
    const templates = await db.getAll(`
      SELECT 
        pt.*,
        p.name as product_name, 
        p.serial_number,
        u.username as created_by_username
      FROM product_templates pt
      JOIN products p ON pt.product_id = p.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.active = true
      ORDER BY pt.id DESC
    `);

    return templates.map(template => new ProductTemplate(template));
  }

  async findById(id) {
    const template = await db.getOne(`
      SELECT 
        pt.*,
        p.name as product_name, 
        p.serial_number, 
        u.username as created_by_username
      FROM product_templates pt
      JOIN products p ON pt.product_id = p.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.id = $1 AND pt.active = true
    `, [id]);

    if (!template) return null;

    return new ProductTemplate(template);
  }

  async findByProductId(productId) {
    const templates = await db.getAll(`
      SELECT 
        pt.*,
        p.name as product_name, 
        p.serial_number, 
        u.username as created_by_username
      FROM product_templates pt
      JOIN products p ON pt.product_id = p.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.product_id = $1 AND pt.active = true
      ORDER BY pt.id DESC
    `, [productId]);

    return templates.map(template => new ProductTemplate(template));
  }

  async create(templateData) {
    const result = await db.execute(`
      INSERT INTO product_templates (
        product_id, final_price, promo_price, discount_price, width, height, colors, position, 
        texts, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
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
    ]);

    return await this.findById(result.lastInsertRowid);
  }

  async update(id, templateData) {
    const result = await db.execute(`
      UPDATE product_templates 
      SET product_id = $1, final_price = $2, promo_price = $3, discount_price = $4, width = $5, height = $6, colors = $7, 
          position = $8, texts = $9, description = $10
      WHERE id = $11
    `, [
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
    ]);

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE product_templates SET active = false WHERE id = $1', [id]);

    return result.changes > 0;
  }

  // Búsqueda avanzada
  async searchByTerm(searchTerm) {
    const term = `%${searchTerm}%`;
    const templates = await db.getAll(`
      SELECT 
        pt.*,
        p.name as product_name, 
        p.serial_number, 
        u.username as created_by_username
      FROM product_templates pt
      JOIN products p ON pt.product_id = p.id
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.active = true AND (
        pt.description ILIKE $1 OR 
        p.name ILIKE $1 OR 
        p.serial_number ILIKE $1 OR
        pt.position ILIKE $1 OR
        pt.texts ILIKE $1 OR
        u.username ILIKE $1
      )
      ORDER BY pt.id DESC
    `, [term]);

    return templates.map(template => new ProductTemplate(template));
  }
}

module.exports = new ProductTemplateRepository();
