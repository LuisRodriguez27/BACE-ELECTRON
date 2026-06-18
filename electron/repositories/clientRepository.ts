import db from '../db';
import Client from '../domain/client';
import type { ClientRow } from '../types/client';

class ClientRepository {
  async findAll() {
    const clients = await db.getAll<ClientRow>('SELECT * FROM clients WHERE active = true ORDER BY id DESC');
    return clients.map((c) => new Client(c));
  }

  async findAllInvested() {
    const clients = await db.getAll<ClientRow>('SELECT * FROM clients WHERE active = true ORDER BY id ASC');
    return clients.map((c) => new Client(c));
  }

  async findById(id: number) {
    const client = await db.getOne<ClientRow>('SELECT * FROM clients WHERE id = $1 AND active = true', [id]);
    if (!client) return null;
    return new Client(client);
  }

  async findByPhone(phone: string) {
    const client = await db.getOne<ClientRow>('SELECT * FROM clients WHERE phone = $1 AND active = true', [phone]);
    if (!client) return null;
    return new Client(client);
  }

  async create(clientData: { name: string; phone: string; address?: string | null; description?: string | null; color?: string | null }) {
    const result = await db.execute(`
      INSERT INTO clients (name, phone, address, description, color) VALUES ($1, $2, $3, $4, $5)
    `, [clientData.name, clientData.phone, clientData.address || null, clientData.description || null, clientData.color || null]);
    return new Client({ id: result.lastInsertRowid!, name: clientData.name, phone: clientData.phone, address: clientData.address ?? null, description: clientData.description ?? null, color: clientData.color ?? null, active: true });
  }

  async update(id: number, clientData: { name: string; phone: string; address?: string | null; description?: string | null; color?: string | null }): Promise<boolean> {
    const result = await db.execute(`UPDATE clients SET name = $1, phone = $2, address = $3, description = $4, color = $5 WHERE id = $6`, [clientData.name, clientData.phone, clientData.address || null, clientData.description || null, clientData.color || null, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE clients SET active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async existsByPhone(phone: string, excludeClientId: number | null = null): Promise<boolean> {
    let query = 'SELECT id FROM clients WHERE phone = $1 AND active = true';
    const params: unknown[] = [phone];
    if (excludeClientId) { query += ' AND id != $2'; params.push(excludeClientId); }
    return !!(await db.getOne<{ id: number }>(query, params));
  }

  async searchByTerm(searchTerm: string) {
    const term = `%${searchTerm}%`;
    const clients = await db.getAll<ClientRow>(`
      SELECT * FROM clients WHERE active = true AND (CAST(id AS TEXT) ILIKE $1 OR name ILIKE $1 OR phone ILIKE $1 OR address ILIKE $1 OR description ILIKE $1)
      ORDER BY name
    `, [term]);
    return clients.map((c) => new Client(c));
  }

  async findPaginated(page = 1, limit = 10, searchTerm = '') {
    const offset = (page - 1) * limit;
    let searchCondition = '';
    let searchParams: unknown[] = [];
    let paramIndex = 1;

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      searchCondition = `AND (CAST(id AS TEXT) ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      searchParams = [term];
      paramIndex = 2;
    }

    const countResult = await db.getOne<{ total: string }>(`SELECT COUNT(*) as total FROM clients WHERE active = true ${searchCondition}`, searchParams);
    const total = parseInt(countResult!.total, 10);
    const clients = await db.getAll<ClientRow>(`SELECT * FROM clients WHERE active = true ${searchCondition} ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...searchParams, limit, offset]);

    return {
      data: clients.map((c) => new Client(c)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
      searchTerm
    };
  }
}

export default new ClientRepository();
