const db = require('../db');
const Product = require('../domain/product');

class ProductRepository {

  async findAll() {
    const stmt = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id DESC');
    const products = await stmt.all();
    
    return products.map(product => new Product(product));
  }

  async findById(id) {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
    const product = await stmt.get(id);
    
    if (!product) return null;
    
    return new Product(product);
  }

  async findBySerialNumber(serialNumber) {
    const stmt = db.prepare('SELECT * FROM products WHERE serial_number = ? AND active = 1');
    const product = await stmt.get(serialNumber);
    
    if (!product) return null;
    
    return new Product(product);
  }

  async create(productData) {
    const stmt = db.prepare(`
      INSERT INTO products (name, serial_number, price, description) 
      VALUES (?, ?, ?, ?)
    `);
    const result = await stmt.run(
      productData.name,
      productData.serial_number || null,
      productData.price,
      productData.description || null
    );

    return new Product({
      id: result.lastInsertRowid,
      name: productData.name,
      serial_number: productData.serial_number,
      price: productData.price,
      description: productData.description,
      active: 1
    });
  }

  async update(id, productData) {
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, serial_number = ?, price = ?, description = ?
      WHERE id = ?
    `);
    const result = await stmt.run(
      productData.name,
      productData.serial_number || null,
      productData.price,
      productData.description || null,
      id
    );

    return result.changes > 0;
  }

  async delete(id) {
    const stmt = db.prepare('UPDATE products SET active = 0 WHERE id = ?');
    const result = await stmt.run(id);
    
    return result.changes > 0;
  }

  async existsBySerialNumber(serialNumber, excludeProductId = null) {
    if (!serialNumber || serialNumber.trim() === '') {
      return false; // Serial number vacío es válido (no único)
    }

    let query = 'SELECT id FROM products WHERE serial_number = ? AND active = 1';
    let params = [serialNumber];
    
    if (excludeProductId) {
      query += ' AND id != ?';
      params.push(excludeProductId);
    }
    
    const stmt = db.prepare(query);
    const result = await stmt.get(...params);
    
    return !!result;
  }

  async countActiveProducts() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1');
    const result = await stmt.get();
    return result.count;
  }

  // Búsqueda avanzada
  async searchByTerm(searchTerm) {
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE active = 1 AND (
        name ILIKE ? OR 
        serial_number ILIKE ? OR 
        description ILIKE ?
      )
      ORDER BY name
    `);
    const term = `%${searchTerm}%`;
    const products = await stmt.all(term, term, term);
    
    return products.map(product => new Product(product));
  }

  // Productos con plantillas (funcionalidad avanzada)
  async findWithTemplates(productId) {
    const product = await this.findById(productId);
    if (!product) return null;

    const templates = await db.prepare(`
      SELECT pt.*, u.username as created_by_username
      FROM product_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.product_id = ? AND pt.active = 1
    `).all(productId);

    return {
      ...product.toPlainObject(),
      templates
    };
  }

  // Productos por rango de precio
  async findByPriceRange(minPrice, maxPrice) {
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE active = 1 AND price BETWEEN ? AND ?
      ORDER BY price, name
    `);
    const products = await stmt.all(minPrice, maxPrice);
    
    return products.map(product => new Product(product));
  }

  // Productos más utilizados (basado en plantillas)
  async findMostUsed(limit = 10) {
    const stmt = db.prepare(`
      SELECT p.*, COUNT(pt.id) as template_count
      FROM products p
      LEFT JOIN product_templates pt ON p.id = pt.product_id AND pt.active = 1
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY template_count DESC, p.name
      LIMIT ?
    `);
    const products = await stmt.all(limit);
    
    return products.map(product => new Product(product));
  }

  // Obtener todos los productos con sus plantillas
  async findAllWithTemplates() {
    const products = await this.findAll();
    const stmt = db.prepare(`
      SELECT pt.*, u.username as created_by_username
      FROM product_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.product_id = ? AND pt.active = 1
    `);

    return await Promise.all(products.map(async product => {
      const templates = await stmt.all(product.id);
      return {
        ...product.toPlainObject(),
        templates
      };
    }));
  }
}

module.exports = new ProductRepository();
