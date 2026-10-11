import supplierRepository from '../repositories/supplierRepository';
import type { SupplierData } from '../types/supplier';
import db from '../db';

class SupplierService {
  async getAllSuppliers() {
    try {
      const suppliers = await supplierRepository.findAll();
      return suppliers.map((s) => s.toPlainObject());
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
      throw new Error('Error al obtener proveedores');
    }
  }

  async getSupplierById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de proveedor inválido');
      const supplier = await supplierRepository.findById(id);
      if (!supplier) throw new Error('Proveedor no encontrado');
      return supplier.toPlainObject();
    } catch (error) {
      console.error('Error al obtener proveedor:', error);
      throw error;
    }
  }

  async createSupplier(data: SupplierData) {
    try {
      const { name, phone, email, description, columns } = data;
      if (!name || !name.trim()) throw new Error('El nombre del proveedor es requerido');
      if (name.trim().length < 3) throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');

      const transaction = db.transaction(async () => {
        if (await supplierRepository.existsByName(name.trim())) throw new Error('Ya existe un proveedor con este nombre');
        const supplier = await supplierRepository.create({ name: name.trim(), phone: phone ? String(phone).trim() : null, email: email ? String(email).trim() : null, description: description ? String(description).trim() : null, columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null });
        return supplier.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      throw error;
    }
  }

  async updateSupplier(id: number, data: SupplierData) {
    try {
      if (!id || id <= 0) throw new Error('ID de proveedor inválido');
      const { name, phone, email, description, columns } = data;
      if (!name || !name.trim()) throw new Error('El nombre del proveedor es requerido');
      if (name.trim().length < 3) throw new Error('El nombre del proveedor debe tener al menos 3 caracteres');

      const transaction = db.transaction(async () => {
        const existing = await supplierRepository.findById(id);
        if (!existing) throw new Error('Proveedor no encontrado');
        if (await supplierRepository.existsByName(name.trim(), id)) throw new Error('Ya existe otro proveedor con este nombre');

        const updated = await supplierRepository.update(id, { name: name.trim(), phone: phone ? String(phone).trim() : null, email: email ? String(email).trim() : null, description: description ? String(description).trim() : null, columns: columns ? (typeof columns === 'string' ? columns.trim() : columns) : null });
        if (!updated) throw new Error('Error al actualizar proveedor');

        const updatedSupplier = await supplierRepository.findById(id);
        if (!updatedSupplier) throw new Error('Error al obtener proveedor actualizado');
        return updatedSupplier.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      throw error;
    }
  }

  async deleteSupplier(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de proveedor inválido');

      const transaction = db.transaction(async () => {
        const existing = await supplierRepository.findById(id);
        if (!existing) throw new Error('Proveedor no encontrado');
        const deleted = await supplierRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar proveedor');
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      throw error;
    }
  }

  async searchSuppliers(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) return this.getAllSuppliers();
      const suppliers = await supplierRepository.searchByTerm(searchTerm.trim());
      return suppliers.map((s) => s.toPlainObject());
    } catch (error) {
      console.error('Error al buscar proveedores:', error);
      throw new Error('Error al buscar proveedores');
    }
  }
}

export default new SupplierService();
