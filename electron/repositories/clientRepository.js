const db = require('../db');
const Client = require('../domain/client');

class ClientRepository {

  async findAll() {
    const clients = await db.getAll('SELECT * FROM clients WHERE active = true');
    
    return clients.map(client => new Client(client));
  }

  async findById(id) {
    const client = await db.getOne('SELECT * FROM clients WHERE id = $1 AND active = true', [id]);
    
    if (!client) return null;
    
    return new Client(client);
  }

  async findByPhone(phone) {
    const client = await db.getOne('SELECT * FROM clients WHERE phone = $1 AND active = true', [phone]);
    
    if (!client) return null;
    
    return new Client(client);
  }

  async create(clientData) {
    const result = await db.execute(`
      INSERT INTO clients (name, phone, address, description, color) 
      VALUES ($1, $2, $3, $4, $5)
    `, [
      clientData.name,
      clientData.phone,
      clientData.address || null,
      clientData.description || null,
      clientData.color || null
    ]);

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
    const result = await db.execute(`
      UPDATE clients 
      SET name = $1, phone = $2, address = $3, description = $4, color = $5 
      WHERE id = $6
    `, [
      clientData.name,
      clientData.phone,
      clientData.address || null,
      clientData.description || null,
      clientData.color || null,
      id
    ]);

    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE clients SET active = false WHERE id = $1', [id]);
    
    return result.changes > 0;
  }

  async existsByPhone(phone, excludeClientId = null) {
    let query = 'SELECT id FROM clients WHERE phone = $1 AND active = true';
    let params = [phone];
    
    if (excludeClientId) {
      query += ' AND id != $2';
      params.push(excludeClientId);
    }
    
    const result = await db.getOne(query, params);
    
    return !!result;
  }

  // Búsqueda por términos (para funcionalidades futuras)
  async searchByTerm(searchTerm) {
    const term = `%${searchTerm}%`;
    const clients = await db.getAll(`
      SELECT * FROM clients 
      WHERE active = true AND (
        CAST(id AS TEXT) ILIKE $1 OR
        name ILIKE $1 OR 
        phone ILIKE $1 OR 
        address ILIKE $1 OR 
        description ILIKE $1
      )
      ORDER BY name
    `, [term]);
    
    return clients.map(client => new Client(client));
  }
}

module.exports = new ClientRepository();
