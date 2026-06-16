const db = require('../db');
const Supplier = require('../domain/supplier');

class SupplierRepository {
  async findAll() {
    const suppliers = await db.getAll('SELECT * FROM suppliers WHERE is_active = true ORDER BY id DESC');
    return suppliers.map(s => new Supplier(s));
  }

  async findById(id) {
    const supplier = await db.getOne('SELECT * FROM suppliers WHERE id = $1 AND is_active = true', [id]);
    if (!supplier) return null;
    return new Supplier(supplier);
  }

  async create(supplierData) {
    const columnsJson = supplierData.columns 
      ? (typeof supplierData.columns === 'string' ? supplierData.columns : JSON.stringify(supplierData.columns))
      : '[]';

    const result = await db.execute(`
      INSERT INTO suppliers (name, phone, email, description, columns, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
    `, [
      supplierData.name.trim(),
      supplierData.phone ? supplierData.phone.trim() : null,
      supplierData.email ? supplierData.email.trim() : null,
      supplierData.description ? supplierData.description.trim() : null,
      columnsJson
    ]);

    return new Supplier({
      id: result.lastInsertRowid,
      name: supplierData.name,
      phone: supplierData.phone,
      email: supplierData.email,
      description: supplierData.description,
      columns: supplierData.columns,
      is_active: true
    });
  }

  async update(id, supplierData) {
    const columnsJson = supplierData.columns 
      ? (typeof supplierData.columns === 'string' ? supplierData.columns : JSON.stringify(supplierData.columns))
      : '[]';

    const result = await db.execute(`
      UPDATE suppliers
      SET name = $1, phone = $2, email = $3, description = $4, columns = $5
      WHERE id = $6 AND is_active = true
    `, [
      supplierData.name.trim(),
      supplierData.phone ? supplierData.phone.trim() : null,
      supplierData.email ? supplierData.email.trim() : null,
      supplierData.description ? supplierData.description.trim() : null,
      columnsJson,
      id
    ]);
    return result.changes > 0;
  }

  async delete(id) {
    const result = await db.execute('UPDATE suppliers SET is_active = false WHERE id = $1', [id]);
    return result.changes > 0;
  }

  async existsByName(name, excludeSupplierId = null) {
    let query = 'SELECT id FROM suppliers WHERE name = $1 AND is_active = true';
    let params = [name];
    
    if (excludeSupplierId) {
      query += ' AND id != $2';
      params.push(excludeSupplierId);
    }
    
    const result = await db.getOne(query, params);
    return !!result;
  }

  async searchByTerm(searchTerm) {
    const term = `%${searchTerm}%`;
    const suppliers = await db.getAll(`
      SELECT * FROM suppliers
      WHERE is_active = true AND (
        CAST(id AS TEXT) ILIKE $1 OR
        name ILIKE $1 OR
        phone ILIKE $1 OR
        email ILIKE $1 OR
        description ILIKE $1 OR
        columns ILIKE $1
      )
      ORDER BY name
    `, [term]);
    
    return suppliers.map(s => new Supplier(s));
  }
}

module.exports = new SupplierRepository();
