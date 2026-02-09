const db = require('../db');
const Client = require('../domain/client');

class ClientRepository {

  findAll() {
    const stmt = db.prepare('SELECT * FROM clients WHERE active = 1');
    const clients = stmt.all();
    
    return clients.map(client => new Client(client));
  }

  findById(id) {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ? AND active = 1');
    const client = stmt.get(id);
    
    if (!client) return null;
    
    return new Client(client);
  }

  findByPhone(phone) {
    const stmt = db.prepare('SELECT * FROM clients WHERE phone = ? AND active = 1');
    const client = stmt.get(phone);
    
    if (!client) return null;
    
    return new Client(client);
  }

  create(clientData) {
    const stmt = db.prepare(`
      INSERT INTO clients (name, phone, address, description, color) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
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
      active: 1
    });
  }

  update(id, clientData) {
    const stmt = db.prepare(`
      UPDATE clients 
      SET name = ?, phone = ?, address = ?, description = ?, color = ? 
      WHERE id = ?
    `);
    const result = stmt.run(
      clientData.name,
      clientData.phone,
      clientData.address || null,
      clientData.description || null,
      clientData.color || null,
      id
    );

    return result.changes > 0;
  }

  delete(id) {
    const stmt = db.prepare('UPDATE clients SET active = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  }

  existsByPhone(phone, excludeClientId = null) {
    let query = 'SELECT id FROM clients WHERE phone = ? AND active = 1';
    let params = [phone];
    
    if (excludeClientId) {
      query += ' AND id != ?';
      params.push(excludeClientId);
    }
    
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    
    return !!result;
  }

  // Búsqueda por términos (para funcionalidades futuras)
  searchByTerm(searchTerm) {
    const stmt = db.prepare(`
      SELECT * FROM clients 
      WHERE active = 1 AND (
        id LIKE ? OR
        name LIKE ? OR 
        phone LIKE ? OR 
        address LIKE ? OR 
        description LIKE ?
      )
      ORDER BY name
    `);
    const term = `%${searchTerm}%`;
    const clients = stmt.all(term, term, term, term);
    
    return clients.map(client => new Client(client));
  }
}

module.exports = new ClientRepository();
