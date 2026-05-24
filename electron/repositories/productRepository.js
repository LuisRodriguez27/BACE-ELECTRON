const db = require('../db');
const Product = require('../domain/product');

class ProductRepository {

  async findAll() {
    const products = await db.getAll('SELECT * FROM products WHERE active = true ORDER BY id DESC');
    
    return products.map(product => new Product(product));
  }

  async findById(id) {
    const product = await db.getOne('SELECT * FROM products WHERE id = $1 AND active = true', [id]);
    
    if (!product) return null;
    
    return new Product(product);
  }

  async findBySerialNumber(serialNumber) {
    const product = await db.getOne('SELECT * FROM products WHERE serial_number = $1 AND active = true', [serialNumber]);
    
    if (!product) return null;
    
    return new Product(product);
  }

  async create(productData) {
    const result = await db.execute(`
      INSERT INTO products (name, serial_number, price, promo_price, discount_price, description, images) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      productData.name,
      productData.serial_number || null,
      productData.price,
      productData.promo_price !== undefined ? productData.promo_price : null,
      productData.discount_price !== undefined ? productData.discount_price : null,
      productData.description || null,
      productData.images ? JSON.stringify(productData.images) : '[]'
    ]);

    return new Product({
      id: result.lastInsertRowid,
      name: productData.name,
      serial_number: productData.serial_number,
      price: productData.price,
      promo_price: productData.promo_price,
      discount_price: productData.discount_price,
      description: productData.description,
      images: productData.images || [],
      active: true
    });
  }

  async update(id, productData) {
    const result = await db.execute(`
      UPDATE products 
      SET name = $1, serial_number = $2, price = $3, promo_price = $4, discount_price = $5, description = $6, images = $7
      WHERE id = $8
    `, [
      productData.name,
      productData.serial_number || null,
      productData.price,
      productData.promo_price !== undefined ? productData.promo_price : null,
      productData.discount_price !== undefined ? productData.discount_price : null,
      productData.description || null,
      productData.images ? JSON.stringify(productData.images) : '[]',
      id
    ]);

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE products SET active = false WHERE id = $1', [id]);
    
    return result.changes > 0;
  }

  async existsBySerialNumber(serialNumber, excludeProductId = null) {
    if (!serialNumber || serialNumber.trim() === '') {
      return false; // Serial number vacío es válido (no único)
    }

    let query = 'SELECT id FROM products WHERE serial_number = $1 AND active = true';
    let params = [serialNumber];
    
    if (excludeProductId) {
      query += ' AND id != $2';
      params.push(excludeProductId);
    }
    
    const result = await db.getOne(query, params);
    
    return !!result;
  }

  async countActiveProducts() {
    const result = await db.getOne('SELECT COUNT(*) as count FROM products WHERE active = true');
    return result.count;
  }

  // Búsqueda avanzada y flexible
  async searchByTerm(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) return [];

    const cleanTerm = searchTerm.trim();
    
    // 1. Búsqueda exacta parcial (el % permite "La" -> "Lapiz")
    const exactLike = `%${cleanTerm}%`;
    
    // 2. Búsqueda sin espacios (ej. si buscan "cocacola" encuentra "coca cola")
    const condensedTerm = `%${cleanTerm.replace(/\s+/g, '')}%`;

    // 3. Búsqueda por palabras (sin importar el orden, ej. "pro macbook" encuentra "macbook pro")
    const words = cleanTerm.split(/[\s\-\.,_]+/).filter(w => w.length > 0);
    
    const wordConditions = [];
    const params = [exactLike, condensedTerm, cleanTerm]; 
    
    let paramIndex = 4;
    for (const word of words) {
      params.push(`%${word}%`);
      wordConditions.push(`(
        unaccent(name) ILIKE unaccent($${paramIndex}) OR 
        unaccent(serial_number) ILIKE unaccent($${paramIndex}) OR 
        unaccent(description) ILIKE unaccent($${paramIndex})
      )`);
      paramIndex++;
    }
    
    const wordsWhereClause = wordConditions.length > 0 ? wordConditions.join(' AND ') : 'false';

    const products = await db.getAll(`
      SELECT *, 
             similarity(unaccent(name), unaccent($3)) as sim_name,
             word_similarity(unaccent($3), unaccent(name)) as wsim_name
      FROM products 
      WHERE active = true AND (
        -- Mantenemos la coincidencia parcial exacta para el debounce ("La" -> "Lapiz") ignorando acentos
        (unaccent(name) ILIKE unaccent($1) OR unaccent(serial_number) ILIKE unaccent($1) OR unaccent(description) ILIKE unaccent($1))
        OR
        (unaccent(REPLACE(name, ' ', '')) ILIKE unaccent($2))
        OR
        (${wordsWhereClause})
        OR
        -- Búsqueda difusa combinada con unaccent. 
        -- word_similarity es excelente para errores tipográficos en palabras parciales ("lapis" dentro de "lapicero")
        (similarity(unaccent(name), unaccent($3)) > 0.25 OR word_similarity(unaccent($3), unaccent(name)) > 0.4)
      )
      ORDER BY 
        -- Ordena priorizando coincidencias exactas y luego similitudes más fuertes
        (unaccent(name) ILIKE unaccent($1)) DESC,
        wsim_name DESC,
        sim_name DESC, 
        name
    `, params);
    
    return products.map(product => new Product(product));
  }

  // Productos con plantillas (funcionalidad avanzada)
  async findWithTemplates(productId) {
    const product = await this.findById(productId);
    if (!product) return null;

    const templates = await db.getAll(`
      SELECT pt.*, u.username as created_by_username
      FROM product_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.product_id = $1 AND pt.active = true
    `, [productId]);

    return {
      ...product.toPlainObject(),
      templates
    };
  }

  // Productos por rango de precio
  async findByPriceRange(minPrice, maxPrice) {
    const products = await db.getAll(`
      SELECT * FROM products 
      WHERE active = true AND price BETWEEN $1 AND $2
      ORDER BY price, name
    `, [minPrice, maxPrice]);
    
    return products.map(product => new Product(product));
  }

  // Productos más utilizados (basado en plantillas)
  async findMostUsed(limit = 10) {
    const products = await db.getAll(`
      SELECT p.*, COUNT(pt.id) as template_count
      FROM products p
      LEFT JOIN product_templates pt ON p.id = pt.product_id AND pt.active = true
      WHERE p.active = true
      GROUP BY p.id
      ORDER BY template_count DESC, p.name
      LIMIT $1
    `, [limit]);
    
    return products.map(product => new Product(product));
  }

  // Obtener todos los productos con sus plantillas
  async findAllWithTemplates() {
    const products = await this.findAll();

    return await Promise.all(products.map(async product => {
      const templates = await db.getAll(`
        SELECT pt.*, u.username as created_by_username
        FROM product_templates pt
        LEFT JOIN users u ON pt.created_by = u.id
        WHERE pt.product_id = $1 AND pt.active = true
      `, [product.id]);
      return {
        ...product.toPlainObject(),
        templates
      };
    }));
  }

  // Buscar productos con sus plantillas
  async searchWithTemplates(searchTerm) {
    const products = await this.searchByTerm(searchTerm);

    return await Promise.all(products.map(async product => {
      const templates = await db.getAll(`
        SELECT pt.*, u.username as created_by_username
        FROM product_templates pt
        LEFT JOIN users u ON pt.created_by = u.id
        WHERE pt.product_id = $1 AND pt.active = true
      `, [product.id]);
      return {
        ...product.toPlainObject(),
        templates
      };
    }));
  }
}

module.exports = new ProductRepository();
