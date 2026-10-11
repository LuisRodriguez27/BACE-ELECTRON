import clientRepository from '../repositories/clientRepository';
import type { ClientData } from '../types/client';
import db from '../db';

class ClientService {
  async getAllClients() {
    try {
      const clients = await clientRepository.findAll();
      return clients.map((c) => c.toPlainObject());
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error('Error al obtener clientes');
    }
  }

  async getAllInvestedClients() {
    try {
      const clients = await clientRepository.findAllInvested();
      return clients.map((c) => c.toPlainObject());
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error('Error al obtener clientes');
    }
  }

  async getClientById(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de cliente inválido');
      const client = await clientRepository.findById(id);
      if (!client) throw new Error('Cliente no encontrado');
      return client.toPlainObject();
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw error;
    }
  }

  async createClient(data: ClientData) {
    try {
      const { name, phone, address, description, color } = data;
      if (!name || !phone) throw new Error('Nombre y teléfono son requeridos');
      if (name.trim().length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
      if (phone.trim().length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos');

      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) throw new Error('El teléfono contiene caracteres inválidos');

      const transaction = db.transaction(async () => {
        if (await clientRepository.existsByPhone(phone.trim())) throw new Error('Ya existe un cliente con este teléfono');
        const client = await clientRepository.create({ name: name.trim(), phone: phone.trim(), address: address?.trim() || null, description: description?.trim() || null, color: color?.trim() || null });
        return client.toPlainObject();
      });

      return await transaction();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      throw error;
    }
  }

  async updateClient(id: number, data: ClientData) {
    try {
      const { name, phone, address, description, color } = data;
      if (!id || id <= 0) throw new Error('ID de cliente inválido');
      if (!name || !phone) throw new Error('Nombre y teléfono son requeridos');
      if (name.trim().length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
      if (phone.trim().length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos');

      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) throw new Error('El teléfono contiene caracteres inválidos');

      const transaction = db.transaction(async () => {
        const existingClient = await clientRepository.findById(id);
        if (!existingClient) throw new Error('Cliente no encontrado');
        if (await clientRepository.existsByPhone(phone.trim(), id)) throw new Error('Ya existe otro cliente con este teléfono');

        const updated = await clientRepository.update(id, { name: name.trim(), phone: phone.trim(), address: address?.trim() || null, description: description?.trim() || null, color: color?.trim() || null });
        if (!updated) throw new Error('Error al actualizar cliente');

        const updatedClient = await clientRepository.findById(id);
        if (!updatedClient) throw new Error('Error: no se pudo recuperar el cliente actualizado');

        const result = updatedClient.toPlainObject();
        if (!result.id || !result.name) { console.error('Cliente actualizado inválido:', result); throw new Error('Datos del cliente actualizado inválidos'); }
        return result;
      });

      return await transaction();
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  async deleteClient(id: number) {
    try {
      if (!id || id <= 0) throw new Error('ID de cliente inválido');

      const transaction = db.transaction(async () => {
        const existingClient = await clientRepository.findById(id);
        if (!existingClient) throw new Error('Cliente no encontrado');
        const deleted = await clientRepository.delete(id);
        if (!deleted) throw new Error('Error al eliminar cliente');
      });

      await transaction();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  async searchClients(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) return this.getAllClients();
      const clients = await clientRepository.searchByTerm(searchTerm.trim());
      return clients.map((c) => c.toPlainObject());
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      throw new Error('Error al buscar clientes');
    }
  }

  async getClientsPaginated(page = 1, limit = 10, searchTerm = '') {
    try {
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 10;
      const result = await clientRepository.findPaginated(page, limit, searchTerm);
      return { data: result.data.map((c) => c.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener clientes paginados:', error);
      throw new Error('Error al obtener clientes paginados');
    }
  }
}

export default new ClientService();
