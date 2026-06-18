import db from '../db';
import Product from '../domain/product';
import type { ProductRow } from '../types/product';

class ProductRepository {
  async findAll() {
    const products = await db.getAll<ProductRow>('SELECT * FROM products WHERE active = true ORDER BY id DESC');
    return products.map((p) => new Product(p));
  }

  async findById(id: number) {
    const product = await db.getOne<ProductRow>('SELECT * FROM products WHERE id = $1 AND active = true', [id]);
    if (!product) return null;
    return new Product(product);
  }

  async findBySerialNumber(serialNumber: string) {
    const product = await db.getOne<ProductRow>('SELECT * FROM products WHERE serial_number = $1 AND active = true', [serialNumber]);
    if (!product) return null;
    return new Product(product);
  }

  async create(productData: { name: string; serial_number?: string | null; price: number; promo_price?: number | null; discount_price?: number | null; description?: string | null; images?: string[] | null }): Promise<Product> {
    const result = await db.execute(`INSERT INTO products (name, serial_number, price, promo_price, discount_price, description, images) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [productData.name, productData.serial_number || null, productData.price, productData.promo_price !== undefined ? productData.promo_price : null, productData.discount_price !== undefined ? productData.discount_price : null, productData.description || null, productData.images ? JSON.stringify(productData.images) : '[]']);
    const product = await this.findById(result.lastInsertRowid!);
    if (!product) throw new Error('Error al crear el producto');
    return product;
  }

  async update(id: number, productData: { name: string; serial_number?: string | null; price: number; promo_price?: number | null; discount_price?: number | null; description?: string | null; images?: string[] | null }): Promise<boolean> {
    const result = await db.execute(`UPDATE products SET name = $1, serial_number = $2, price = $3, promo_price = $4, discount_price = $5, description = $6, images = $7 WHERE id = $8`, [productData.name, productData.serial_number || null, productData.price, productData.promo_price !== undefined ? productData.promo_price : null, productData.discount_price !== undefined ? productData.discount_price : null, productData.description || null, productData.images ? JSON.stringify(productData.images) : '[]', id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE products SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async existsBySerialNumber(serialNumber: string, excludeProductId: number | null = null): Promise<boolean> {
    if (!serialNumber || serialNumber.trim() === '') return false;
    let query = 'SELECT id FROM products WHERE serial_number = $1 AND active = true';
    const params: unknown[] = [serialNumber];
    if (excludeProductId) { query += ' AND id != $2'; params.push(excludeProductId); }
    return !!(await db.getOne(query, params));
  }

  async countActiveProducts(): Promise<number> {
    const result = await db.getOne<{ count: string }>('SELECT COUNT(*) as count FROM products WHERE active = true');
    return parseInt(result!.count, 10);
  }

  async searchByTerm(searchTerm: string) {
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) return [];
    const cleanTerm = searchTerm.trim();
    const exactLike = `%${cleanTerm}%`;
    const condensedTerm = `%${cleanTerm.replace(/\s+/g, '')}%`;
    const words = cleanTerm.split(/[\s\-\.,_]+/).filter(w => w.length > 0);
    const wordConditions: string[] = [];
    const params: unknown[] = [exactLike, condensedTerm, cleanTerm];
    let paramIndex = 4;
    for (const word of words) {
      params.push(`%${word}%`);
      wordConditions.push(`(unaccent(name) ILIKE unaccent($${paramIndex}) OR unaccent(serial_number) ILIKE unaccent($${paramIndex}) OR unaccent(description) ILIKE unaccent($${paramIndex}))`);
      paramIndex++;
    }
    const wordsWhereClause = wordConditions.length > 0 ? wordConditions.join(' AND ') : 'false';
    const products = await db.getAll<ProductRow>(`
      SELECT *, similarity(unaccent(name), unaccent($3)) as sim_name, word_similarity(unaccent($3), unaccent(name)) as wsim_name
      FROM products WHERE active = true AND (
        (unaccent(name) ILIKE unaccent($1) OR unaccent(serial_number) ILIKE unaccent($1) OR unaccent(description) ILIKE unaccent($1))
        OR (unaccent(REPLACE(name, ' ', '')) ILIKE unaccent($2))
        OR (${wordsWhereClause})
        OR (similarity(unaccent(name), unaccent($3)) > 0.25 OR word_similarity(unaccent($3), unaccent(name)) > 0.4)
      )
      ORDER BY (unaccent(name) ILIKE unaccent($1)) DESC, wsim_name DESC, sim_name DESC, name
    `, params);
    return products.map((p) => new Product(p));
  }

  async findWithTemplates(productId: number) {
    const product = await this.findById(productId);
    if (!product) return null;
    const templates = await db.getAll(`SELECT pt.*, u.username as created_by_username FROM product_templates pt LEFT JOIN users u ON pt.created_by = u.id WHERE pt.product_id = $1 AND pt.active = true`, [productId]);
    return { ...product.toPlainObject(), templates };
  }

  async findByPriceRange(minPrice: number, maxPrice: number) {
    const products = await db.getAll<ProductRow>(`SELECT * FROM products WHERE active = true AND price BETWEEN $1 AND $2 ORDER BY price, name`, [minPrice, maxPrice]);
    return products.map((p) => new Product(p));
  }

  async findMostUsed(limit = 10) {
    const products = await db.getAll<ProductRow>(`SELECT p.*, COUNT(pt.id) as template_count FROM products p LEFT JOIN product_templates pt ON p.id = pt.product_id AND pt.active = true WHERE p.active = true GROUP BY p.id ORDER BY template_count DESC, p.name LIMIT $1`, [limit]);
    return products.map((p) => new Product(p));
  }

  async findAllWithTemplates() {
    const products = await this.findAll();
    return await Promise.all(products.map(async (product) => {
      const templates = await db.getAll(`SELECT pt.*, u.username as created_by_username FROM product_templates pt LEFT JOIN users u ON pt.created_by = u.id WHERE pt.product_id = $1 AND pt.active = true`, [product.id]);
      return { ...product.toPlainObject(), templates };
    }));
  }

  async searchWithTemplates(searchTerm: string) {
    const products = await this.searchByTerm(searchTerm);
    return await Promise.all(products.map(async (product) => {
      const templates = await db.getAll(`SELECT pt.*, u.username as created_by_username FROM product_templates pt LEFT JOIN users u ON pt.created_by = u.id WHERE pt.product_id = $1 AND pt.active = true`, [product.id]);
      return { ...product.toPlainObject(), templates };
    }));
  }

  async findPaginatedWithTemplates(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let products: InstanceType<typeof Product>[] = [];
    let total = 0;

    if (!searchTerm || !searchTerm.trim()) {
      const countResult = await db.getOne<{ total: string }>('SELECT COUNT(*) as total FROM products WHERE active = true');
      total = parseInt(countResult!.total, 10) || 0;
      const raw = await db.getAll<ProductRow>(`SELECT * FROM products WHERE active = true ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      products = raw.map((p) => new Product(p));
    } else {
      const cleanTerm = searchTerm.trim();
      const exactLike = `%${cleanTerm}%`;
      const condensedTerm = `%${cleanTerm.replace(/\s+/g, '')}%`;
      const words = cleanTerm.split(/[\s\-\.,_]+/).filter(w => w.length > 0);
      const wordConditions: string[] = [];
      const params: unknown[] = [exactLike, condensedTerm, cleanTerm];
      let paramIndex = 4;
      for (const word of words) {
        params.push(`%${word}%`);
        wordConditions.push(`(unaccent(name) ILIKE unaccent($${paramIndex}) OR unaccent(serial_number) ILIKE unaccent($${paramIndex}) OR unaccent(description) ILIKE unaccent($${paramIndex}))`);
        paramIndex++;
      }
      const wordsWhereClause = wordConditions.length > 0 ? wordConditions.join(' AND ') : 'false';
      const whereClause = `active = true AND ((unaccent(name) ILIKE unaccent($1) OR unaccent(serial_number) ILIKE unaccent($1) OR unaccent(description) ILIKE unaccent($1)) OR (unaccent(REPLACE(name, ' ', '')) ILIKE unaccent($2)) OR (${wordsWhereClause}) OR (similarity(unaccent(name), unaccent($3)) > 0.25 OR word_similarity(unaccent($3), unaccent(name)) > 0.4))`;
      const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM products WHERE ${whereClause}`, params);
      total = parseInt(countResult!.total, 10) || 0;
      const limitIdx = paramIndex, offsetIdx = paramIndex + 1;
      const raw = await db.getAll<ProductRow>(`SELECT *, similarity(unaccent(name), unaccent($3)) as sim_name, word_similarity(unaccent($3), unaccent(name)) as wsim_name FROM products WHERE ${whereClause} ORDER BY (unaccent(name) ILIKE unaccent($1)) DESC, wsim_name DESC, sim_name DESC, name LIMIT $${limitIdx} OFFSET $${offsetIdx}`, [...params, limit, offset]);
      products = raw.map((p) => new Product(p));
    }

    const withTemplates = await Promise.all(products.map(async (product) => {
      const templates = await db.getAll(`SELECT pt.*, u.username as created_by_username FROM product_templates pt LEFT JOIN users u ON pt.created_by = u.id WHERE pt.product_id = $1 AND pt.active = true`, [product.id]);
      return { ...product.toPlainObject(), templates };
    }));

    return { data: withTemplates, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 }, searchTerm };
  }
}

export default new ProductRepository();
