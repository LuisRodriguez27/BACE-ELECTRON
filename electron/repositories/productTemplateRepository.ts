import db from '../db';
import ProductTemplate from '../domain/productTemplate';
import type { ProductTemplateRow } from '../types/productTemplate';

class ProductTemplateRepository {
  private _selectQuery = `
    SELECT pt.*, p.name as product_name, p.serial_number, u.username as created_by_username
    FROM product_templates pt
    JOIN products p ON pt.product_id = p.id
    LEFT JOIN users u ON pt.created_by = u.id
  `;

  async findAll() {
    const templates = await db.getAll<ProductTemplateRow>(`${this._selectQuery} WHERE pt.active = true ORDER BY pt.id DESC`);
    return templates.map((t) => new ProductTemplate(t));
  }

  async findById(id: number) {
    const template = await db.getOne<ProductTemplateRow>(`${this._selectQuery} WHERE pt.id = $1 AND pt.active = true`, [id]);
    if (!template) return null;
    return new ProductTemplate(template);
  }

  async findByProductId(productId: number) {
    const templates = await db.getAll<ProductTemplateRow>(`${this._selectQuery} WHERE pt.product_id = $1 AND pt.active = true ORDER BY pt.id DESC`, [productId]);
    return templates.map((t) => new ProductTemplate(t));
  }

  async create(templateData: { product_id: number; final_price: number; promo_price?: number | null; discount_price?: number | null; width?: number | null; height?: number | null; colors?: string | null; position?: string | null; texts?: string | null; description?: string | null; created_by?: number | null }) {
    const result = await db.execute(`
      INSERT INTO product_templates (product_id, final_price, promo_price, discount_price, width, height, colors, position, texts, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [templateData.product_id, templateData.final_price, templateData.promo_price !== undefined ? templateData.promo_price : null, templateData.discount_price !== undefined ? templateData.discount_price : null, templateData.width || null, templateData.height || null, templateData.colors || null, templateData.position || null, templateData.texts || null, templateData.description || null, templateData.created_by || null]);
    return await this.findById(result.lastInsertRowid!);
  }

  async update(id: number, templateData: { product_id: number; final_price: number; promo_price?: number | null; discount_price?: number | null; width?: number | null; height?: number | null; colors?: string | null; position?: string | null; texts?: string | null; description?: string | null }): Promise<boolean> {
    const result = await db.execute(`
      UPDATE product_templates SET product_id = $1, final_price = $2, promo_price = $3, discount_price = $4, width = $5, height = $6, colors = $7, position = $8, texts = $9, description = $10 WHERE id = $11
    `, [templateData.product_id, templateData.final_price, templateData.promo_price !== undefined ? templateData.promo_price : null, templateData.discount_price !== undefined ? templateData.discount_price : null, templateData.width || null, templateData.height || null, templateData.colors || null, templateData.position || null, templateData.texts || null, templateData.description || null, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE product_templates SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async searchByTerm(searchTerm: string) {
    const term = `%${searchTerm}%`;
    const templates = await db.getAll<ProductTemplateRow>(`${this._selectQuery} WHERE pt.active = true AND (pt.description ILIKE $1 OR p.name ILIKE $1 OR p.serial_number ILIKE $1 OR pt.position ILIKE $1 OR pt.texts ILIKE $1 OR u.username ILIKE $1) ORDER BY pt.id DESC`, [term]);
    return templates.map((t) => new ProductTemplate(t));
  }

  async findPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let templates: InstanceType<typeof ProductTemplate>[] = [];
    let total = 0;

    if (!searchTerm || !searchTerm.trim()) {
      const countResult = await db.getOne<{ total: string }>('SELECT COUNT(*) as total FROM product_templates WHERE active = true');
      total = parseInt(countResult!.total, 10) || 0;
      const raw = await db.getAll<ProductTemplateRow>(`${this._selectQuery} WHERE pt.active = true ORDER BY pt.id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      templates = raw.map((t) => new ProductTemplate(t));
    } else {
      const term = `%${searchTerm.trim()}%`;
      const searchWhere = `pt.active = true AND (pt.description ILIKE $1 OR p.name ILIKE $1 OR p.serial_number ILIKE $1 OR pt.position ILIKE $1 OR pt.texts ILIKE $1 OR u.username ILIKE $1)`;
      const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM product_templates pt JOIN products p ON pt.product_id = p.id LEFT JOIN users u ON pt.created_by = u.id WHERE ${searchWhere}`, [term]);
      total = parseInt(countResult!.total, 10) || 0;
      const raw = await db.getAll<ProductTemplateRow>(`${this._selectQuery} WHERE ${searchWhere} ORDER BY pt.id DESC LIMIT $2 OFFSET $3`, [term, limit, offset]);
      templates = raw.map((t) => new ProductTemplate(t));
    }

    const totalPages = Math.ceil(total / limit);
    return { data: templates, pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }, searchTerm };
  }
}

export default new ProductTemplateRepository();
