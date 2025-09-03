const db = require('../db');
const Product = require('../domain/product');

class ProductRepository {

  findAll() {
    const stmt = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id DESC');
    const products = stmt.all();
    
    return products.map(product => new Product(product));
  }

  findById(id) {
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1');
    const product = stmt.get(id);
    
    if (!product) return null;
    
    return new Product(product);
  }

  findBySerialNumber(serialNumber) {
    const stmt = db.prepare('SELECT * FROM products WHERE serial_number = ? AND active = 1');
    const product = stmt.get(serialNumber);
    
    if (!product) return null;
    
    return new Product(product);
  }

  create(productData) {
    const stmt = db.prepare(`
      INSERT INTO products (name, serial_number, price, description) 
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
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

  update(id, productData) {
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, serial_number = ?, price = ?, description = ?
      WHERE id = ?
    `);
    const result = stmt.run(
      productData.name,
      productData.serial_number || null,
      productData.price,
      productData.description || null,
      id
    );

    return result.changes > 0;
  }

  delete(id) {
    const stmt = db.prepare('UPDATE products SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  // Eliminación física (para casos especiales)
  remove(id) {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  existsBySerialNumber(serialNumber, excludeProductId = null) {
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
    const result = stmt.get(...params);
    
    return !!result;
  }

  countActiveProducts() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1');
    const result = stmt.get();
    return result.count;
  }

  // Búsqueda avanzada
  searchByTerm(searchTerm) {
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE active = 1 AND (
        name LIKE ? OR 
        serial_number LIKE ? OR 
        description LIKE ?
      )
      ORDER BY name
    `);
    const term = `%${searchTerm}%`;
    const products = stmt.all(term, term, term);
    
    return products.map(product => new Product(product));
  }

  // Productos con plantillas (funcionalidad avanzada)
  findWithTemplates(productId) {
    const product = this.findById(productId);
    if (!product) return null;

    const templates = db.prepare(`
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
  findByPriceRange(minPrice, maxPrice) {
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE active = 1 AND price BETWEEN ? AND ?
      ORDER BY price, name
    `);
    const products = stmt.all(minPrice, maxPrice);
    
    return products.map(product => new Product(product));
  }

  // Productos más utilizados (basado en plantillas)
  findMostUsed(limit = 10) {
    const stmt = db.prepare(`
      SELECT p.*, COUNT(pt.id) as template_count
      FROM products p
      LEFT JOIN product_templates pt ON p.id = pt.product_id AND pt.active = 1
      WHERE p.active = 1
      GROUP BY p.id
      ORDER BY template_count DESC, p.name
      LIMIT ?
    `);
    const products = stmt.all(limit);
    
    return products.map(product => new Product(product));
  }
}

module.exports = new ProductRepository();
