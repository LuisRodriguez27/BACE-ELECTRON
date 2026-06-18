import db from '../db';
import Supplier from '../domain/supplier';
import type { SupplierRow, SupplierData } from '../types/supplier';

class SupplierRepository {
  async findAll() {
    const suppliers = await db.getAll<SupplierRow>('SELECT * FROM suppliers WHERE is_active = true ORDER BY id DESC');
    return suppliers.map((s) => new Supplier(s));
  }

  async findById(id: number) {
    const supplier = await db.getOne<SupplierRow>('SELECT * FROM suppliers WHERE id = $1 AND is_active = true', [id]);
    if (!supplier) return null;
    return new Supplier(supplier);
  }

  async create(supplierData: SupplierData): Promise<Supplier> {
    const columnsJson = supplierData.columns
      ? (typeof supplierData.columns === 'string' ? supplierData.columns : JSON.stringify(supplierData.columns))
      : '[]';
    const result = await db.execute(`INSERT INTO suppliers (name, phone, email, description, columns, is_active) VALUES ($1, $2, $3, $4, $5, true)`, [supplierData.name.trim(), supplierData.phone ? String(supplierData.phone).trim() : null, supplierData.email ? String(supplierData.email).trim() : null, supplierData.description ? String(supplierData.description).trim() : null, columnsJson]);
    const supplier = await this.findById(result.lastInsertRowid!);
    if (!supplier) throw new Error('Error al crear el proveedor');
    return supplier;
  }

  async update(id: number, supplierData: SupplierData): Promise<boolean> {
    const columnsJson = supplierData.columns
      ? (typeof supplierData.columns === 'string' ? supplierData.columns : JSON.stringify(supplierData.columns))
      : '[]';
    const result = await db.execute(`UPDATE suppliers SET name = $1, phone = $2, email = $3, description = $4, columns = $5 WHERE id = $6 AND is_active = true`, [supplierData.name.trim(), supplierData.phone ? String(supplierData.phone).trim() : null, supplierData.email ? String(supplierData.email).trim() : null, supplierData.description ? String(supplierData.description).trim() : null, columnsJson, id]);
    return (result.changes ?? 0) > 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.execute('UPDATE suppliers SET is_active = false WHERE id = $1', [id]);
    return (result.changes ?? 0) > 0;
  }

  async existsByName(name: string, excludeSupplierId: number | null = null): Promise<boolean> {
    let query = 'SELECT id FROM suppliers WHERE name = $1 AND is_active = true';
    const params: (string | number)[] = [name];
    if (excludeSupplierId) { query += ' AND id != $2'; params.push(excludeSupplierId); }
    return !!(await db.getOne(query, params));
  }

  async searchByTerm(searchTerm: string) {
    const term = `%${searchTerm}%`;
    const suppliers = await db.getAll<SupplierRow>(`SELECT * FROM suppliers WHERE is_active = true AND (CAST(id AS TEXT) ILIKE $1 OR name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR description ILIKE $1 OR columns ILIKE $1) ORDER BY name`, [term]);
    return suppliers.map((s) => new Supplier(s));
  }
}

export default new SupplierRepository();
