const supplierRepository = require('../repositories/supplierRepository');

class SupplierService {
  async getAllSuppliers() {
    try {
      const suppliers = await supplierRepository.findAll();
      return suppliers.map(s => s.toPlainObject());
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      throw new Error('Error al obtener proveedores');
    }
  }

  async getSupplierById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de proveedor inválido');
      }

      const supplier = await supplierRepository.findById(parseInt(id));
      if (!supplier) {
        throw new Error('Proveedor no encontrado');
      }

      return supplier.toPlainObject();
    } catch (error) {
      console.error('Error al obtener proveedor:', error);
      throw error;
    }
  }

  async createSupplier({ name, phone, email, description, columns }) {
    try {
      if (!name || !name.trim()) {
        throw new Error('El nombre del proveedor es requerido');
      }

      if (name.trim().length < 3) {
        throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');
      }

      // Validar si ya existe un proveedor con ese nombre
      const exists = await supplierRepository.existsByName(name.trim());
      if (exists) {
        throw new Error('Ya existe un proveedor con este nombre');
      }

      const supplier = await supplierRepository.create({
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        description: description ? description.trim() : null,
        columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null
      });

      return supplier.toPlainObject();
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      throw error;
    }
  }

  async updateSupplier(id, { name, phone, email, description, columns }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de proveedor inválido');
      }

      if (!name || !name.trim()) {
        throw new Error('El nombre del proveedor es requerido');
      }

      if (name.trim().length < 3) {
        throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');
      }

      const supplierId = parseInt(id);

      // Verificar si el proveedor existe
      const existing = await supplierRepository.findById(supplierId);
      if (!existing) {
        throw new Error('Proveedor no encontrado');
      }

      // Validar que el nombre no esté en uso por otro proveedor
      const exists = await supplierRepository.existsByName(name.trim(), supplierId);
      if (exists) {
        throw new Error('Ya existe otro proveedor con este nombre');
      }

      const updated = await supplierRepository.update(supplierId, {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        description: description ? description.trim() : null,
        columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null
      });

      if (!updated) {
        throw new Error('Error al actualizar proveedor');
      }

      const updatedSupplier = await supplierRepository.findById(supplierId);
      return updatedSupplier.toPlainObject();
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      throw error;
    }
  }

  async deleteSupplier(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de proveedor inválido');
      }

      const supplierId = parseInt(id);

      const existing = await supplierRepository.findById(supplierId);
      if (!existing) {
        throw new Error('Proveedor no encontrado');
      }

      const deleted = await supplierRepository.delete(supplierId);
      if (!deleted) {
        throw new Error('Error al eliminar proveedor');
      }
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      throw error;
    }
  }

  async searchSuppliers(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAllSuppliers();
      }

      const suppliers = await supplierRepository.searchByTerm(searchTerm.trim());
      return suppliers.map(s => s.toPlainObject());
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      throw new Error('Error al buscar proveedores');
    }
  }
}

module.exports = new SupplierService();
