// eslint-disable-next-line @typescript-eslint/no-require-imports
const supplierRepository = require('../repositories/supplierRepository');

class SupplierService {
  async getAllSuppliers() {
    try {
      const suppliers = await supplierRepository.findAll();
      return suppliers.map((s: { toPlainObject: () => unknown }) => s.toPlainObject());
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      throw new Error('Error al obtener proveedores');
    }
  }

  async getSupplierById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de proveedor inválido');
      const supplier = await supplierRepository.findById(parseInt(String(id)));
      if (!supplier) throw new Error('Proveedor no encontrado');
      return supplier.toPlainObject();
    } catch (error) {
      console.error('Error al obtener proveedor:', error);
      throw error;
    }
  }

  async createSupplier({ name, phone, email, description, columns }: { name: string; phone?: string | null; email?: string | null; description?: string | null; columns?: unknown[] | string | null }) {
    try {
      if (!name || !name.trim()) throw new Error('El nombre del proveedor es requerido');
      if (name.trim().length < 3) throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');
      if (await supplierRepository.existsByName(name.trim())) throw new Error('Ya existe un proveedor con este nombre');

      const supplier = await supplierRepository.create({ name: name.trim(), phone: phone ? String(phone).trim() : null, email: email ? String(email).trim() : null, description: description ? String(description).trim() : null, columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null });
      return supplier.toPlainObject();
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      throw error;
    }
  }

  async updateSupplier(id: number | string, { name, phone, email, description, columns }: { name: string; phone?: string | null; email?: string | null; description?: string | null; columns?: unknown[] | string | null }) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de proveedor inválido');
      if (!name || !name.trim()) throw new Error('El nombre del proveedor es requerido');
      if (name.trim().length < 3) throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');

      const supplierId = parseInt(String(id));
      const existing = await supplierRepository.findById(supplierId);
      if (!existing) throw new Error('Proveedor no encontrado');
      if (await supplierRepository.existsByName(name.trim(), supplierId)) throw new Error('Ya existe otro proveedor con este nombre');

      const updated = await supplierRepository.update(supplierId, { name: name.trim(), phone: phone ? String(phone).trim() : null, email: email ? String(email).trim() : null, description: description ? String(description).trim() : null, columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null });
      if (!updated) throw new Error('Error al actualizar proveedor');

      const updatedSupplier = await supplierRepository.findById(supplierId);
      return updatedSupplier.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      throw error;
    }
  }

  async deleteSupplier(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de proveedor inválido');
      const supplierId = parseInt(String(id));
      const existing = await supplierRepository.findById(supplierId);
      if (!existing) throw new Error('Proveedor no encontrado');
      const deleted = await supplierRepository.delete(supplierId);
      if (!deleted) throw new Error('Error al eliminar proveedor');
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      throw error;
    }
  }

  async searchSuppliers(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) return this.getAllSuppliers();
      const suppliers = await supplierRepository.searchByTerm(searchTerm.trim());
      return suppliers.map((s: { toPlainObject: () => unknown }) => s.toPlainObject());
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      throw new Error('Error al buscar proveedores');
    }
  }
}

export default new SupplierService();
