const db = require('../db');
const Client = require('../domain/client');

class ClientRepository {

  async findAll() {
    const stmt = db.prepare('SELECT * FROM clients WHERE active = true');
    const clients = await stmt.all();
    
    return clients.map(client => new Client(client));
  }

  async findById(id) {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ? AND active = true');
    const client = await stmt.get(id);
    
    if (!client) return null;
    
    return new Client(client);
  }

  async findByPhone(phone) {
    const stmt = db.prepare('SELECT * FROM clients WHERE phone = ? AND active = true');
    const client = await stmt.get(phone);
    
    if (!client) return null;
    
    return new Client(client);
  }

  async create(clientData) {
    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, address, description, color) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = await stmt.run(
      clientData.name,
      clientData.phone,
      clientData.address || null,
      clientData.description || null,
      clientData.color || null
    );

    return new Client({
      id: result.lastInsertRowid,
      name: clientData.name,
      phone: clientData.phone,
      address: clientData.address,
      description: clientData.description,
      color: clientData.color,
      active: true
    });
  }

  async update(id, clientData) {
    const stmt = db.prepare(`
      UPDATE clients 
      SET name = ?, phone = ?, address = ?, description = ?, color = ? 
      WHERE id = ?
    `);
    const result = await stmt.run(
      clientData.name,
      clientData.phone,
      clientData.address || null,
      clientData.description || null,
      clientData.color || null,
      id
    );

    return result.changes > 0;
  }

  async delete(id) {
    const stmt = db.prepare('UPDATE clients SET active = false WHERE id = ?');
    const result = await stmt.run(id);
    
    return result.changes > 0;
  }

  async existsByPhone(phone, excludeClientId = null) {
    let query = 'SELECT id FROM clients WHERE phone = ? AND active = true';
    let params = [phone];
    
    if (excludeClientId) {
      query += ' AND id != ?';
      params.push(excludeClientId);
    }
    
    const stmt = db.prepare(query);
    const result = await stmt.get(...params);
    
    return !!result;
  }

  // Búsqueda por términos (para funcionalidades futuras)
  async searchByTerm(searchTerm) {
    const stmt = db.prepare(`
      SELECT * FROM clients 
      WHERE active = true AND (
        CAST(id AS TEXT) ILIKE ? OR
        name ILIKE ? OR 
        phone ILIKE ? OR 
        address ILIKE ? OR 
        description ILIKE ?
      )
      ORDER BY name
    `);
    const term = `%${searchTerm}%`;
    const clients = await stmt.all(term, term, term, term);
    
    return clients.map(client => new Client(client));
  }
}

module.exports = new ClientRepository();
