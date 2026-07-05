import db from '../db';
import ShoppingList from '../domain/shoppingList';
import ShoppingListItem from '../domain/shoppingListItem';
import type { ShoppingListRow, ShoppingListItemRow } from '../types/shoppingList';

class ShoppingListRepository {
  private async _hydrate(listRows: ShoppingListRow[]): Promise<InstanceType<typeof ShoppingList>[]> {
    if (!listRows.length) return [];
    const ids = listRows.map((r) => r.id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

    const itemRows = await db.getAll<ShoppingListItemRow>(
      `SELECT sli.*, p.name as product_name FROM shopping_list_items sli
       JOIN products p ON sli.product_id = p.id
       WHERE sli.shopping_list_id IN (${placeholders}) AND sli.active = TRUE
       ORDER BY sli.id ASC`,
      ids
    );

    const itemsByList = itemRows.reduce((map: Record<string, ShoppingListItemRow[]>, row) => {
      const k = String(row.shopping_list_id);
      (map[k] = map[k] || []).push(row);
      return map;
    }, {});

    return listRows.map((row) => new ShoppingList({ ...row, items: itemsByList[String(row.id)] || [] }));
  }

  async getActive() {
    const row = await db.getOne<ShoppingListRow>(`SELECT * FROM shopping_lists WHERE status = 'open' ORDER BY id DESC LIMIT 1`);
    if (!row) return null;
    const [list] = await this._hydrate([row]);
    return list;
  }

  async getById(id: number) {
    const row = await db.getOne<ShoppingListRow>(`SELECT * FROM shopping_lists WHERE id = $1`, [id]);
    if (!row) return null;
    const [list] = await this._hydrate([row]);
    return list;
  }

  async getClosedPaginated(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [countRow, rows] = await Promise.all([
      db.getOne<{ total: string }>(`SELECT COUNT(*) AS total FROM shopping_lists WHERE status = 'closed'`),
      db.getAll<ShoppingListRow>(`SELECT * FROM shopping_lists WHERE status = 'closed' ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    ]);
    const lists = await this._hydrate(rows);
    const total = parseInt(countRow!.total, 10);
    return { data: lists, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 } };
  }

  async open(data: { notes?: string | null; created_by?: number | null }) {
    const existing = await this.getActive();
    if (existing) throw new Error(`Ya existe una lista de compras abierta (ID: ${existing.id}). Ciérrala antes de abrir una nueva.`);
    const row = await db.getOne<ShoppingListRow>(
      `INSERT INTO shopping_lists (opening_date, status, notes, created_by) VALUES (NOW(), 'open', $1, $2) RETURNING *`,
      [data.notes || null, data.created_by || null]
    );
    const [list] = await this._hydrate([row!]);
    return list;
  }

  async close(id: number, data: { notes?: string | null } = {}) {
    const list = await this.getById(id);
    if (!list) throw new Error('Lista de compras no encontrada.');
    if (!list.isOpen()) throw new Error('La lista de compras ya está cerrada.');
    const row = await db.getOne<ShoppingListRow>(
      `UPDATE shopping_lists SET status = 'closed', closing_date = NOW(), notes = COALESCE($1, notes) WHERE id = $2 RETURNING *`,
      [data.notes ?? null, id]
    );
    const [updated] = await this._hydrate([row!]);
    return updated;
  }

  async getItemById(id: number) {
    const row = await db.getOne<ShoppingListItemRow>(
      `SELECT sli.*, p.name as product_name FROM shopping_list_items sli JOIN products p ON sli.product_id = p.id WHERE sli.id = $1`,
      [id]
    );
    if (!row) return null;
    return new ShoppingListItem(row);
  }

  async addItem(data: { shopping_list_id: number; product_id: number; quantity: number; created_by?: number | null }) {
    const existing = await db.getOne<ShoppingListItemRow>(
      `SELECT * FROM shopping_list_items WHERE shopping_list_id = $1 AND product_id = $2 AND active = TRUE`,
      [data.shopping_list_id, data.product_id]
    );
    if (existing) {
      const newQuantity = (parseFloat(String(existing.quantity)) || 0) + data.quantity;
      await db.execute(`UPDATE shopping_list_items SET quantity = $1, purchased = FALSE WHERE id = $2`, [newQuantity, existing.id]);
      return this.getItemById(existing.id);
    }
    const row = await db.getOne<{ id: number }>(
      `INSERT INTO shopping_list_items (shopping_list_id, product_id, quantity, purchased, created_by, active)
       VALUES ($1, $2, $3, FALSE, $4, TRUE) RETURNING id`,
      [data.shopping_list_id, data.product_id, data.quantity, data.created_by || null]
    );
    return this.getItemById(row!.id);
  }

  async updateItem(id: number, data: { quantity?: number; purchased?: boolean }) {
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];
    let idx = 1;
    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.purchased !== undefined) { fields.push(`purchased = $${idx++}`); values.push(data.purchased); }
    if (fields.length === 0) return this.getItemById(id);
    values.push(id);
    await db.execute(`UPDATE shopping_list_items SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    return this.getItemById(id);
  }

  async removeItem(id: number): Promise<boolean> {
    const result = await db.execute(`UPDATE shopping_list_items SET active = FALSE WHERE id = $1`, [id]);
    return (result.changes ?? 0) > 0;
  }
}

export default new ShoppingListRepository();
