// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientRepository = require('../repositories/clientRepository');

class ClientService {
  async getAllClients() {
    try {
      const clients = await clientRepository.findAll();
      return clients.map((c: { toPlainObject: () => unknown }) => c.toPlainObject());
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error('Error al obtener clientes');
    }
  }

  async getAllInvestedClients() {
    try {
      const clients = await clientRepository.findAllInvested();
      return clients.map((c: { toPlainObject: () => unknown }) => c.toPlainObject());
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error('Error al obtener clientes');
    }
  }

  async getClientById(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de cliente inválido');
      const client = await clientRepository.findById(parseInt(String(id)));
      if (!client) throw new Error('Cliente no encontrado');
      return client.toPlainObject();
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw error;
    }
  }

  async createClient({ name, phone, address, description, color }: { name: string; phone: string; address?: string; description?: string; color?: string }) {
    try {
      if (!name || !phone) throw new Error('Nombre y teléfono son requeridos');
      if (name.trim().length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
      if (phone.trim().length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos');

      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) throw new Error('El teléfono contiene caracteres inválidos');
      if (await clientRepository.existsByPhone(phone.trim())) throw new Error('Ya existe un cliente con este teléfono');

      const client = await clientRepository.create({ name: name.trim(), phone: phone.trim(), address: address?.trim() || null, description: description?.trim() || null, color: color?.trim() || null });
      return client.toPlainObject();
    } catch (error) {
      console.error('Error al crear cliente:', error);
      throw error;
    }
  }

  async updateClient(id: number | string, { name, phone, address, description, color }: { name: string; phone: string; address?: string; description?: string; color?: string }) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de cliente inválido');
      if (!name || !phone) throw new Error('Nombre y teléfono son requeridos');
      if (name.trim().length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
      if (phone.trim().length < 10) throw new Error('El teléfono debe tener al menos 10 dígitos');

      const clientId = parseInt(String(id));
      const existingClient = await clientRepository.findById(clientId);
      if (!existingClient) throw new Error('Cliente no encontrado');

      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) throw new Error('El teléfono contiene caracteres inválidos');
      if (await clientRepository.existsByPhone(phone.trim(), clientId)) throw new Error('Ya existe otro cliente con este teléfono');

      const updated = await clientRepository.update(clientId, { name: name.trim(), phone: phone.trim(), address: address?.trim() || null, description: description?.trim() || null, color: color?.trim() || null });
      if (!updated) throw new Error('Error al actualizar cliente');

      const updatedClient = await clientRepository.findById(clientId);
      if (!updatedClient) throw new Error('Error: no se pudo recuperar el cliente actualizado');

      const result = updatedClient.toPlainObject() as Record<string, unknown>;
      if (!result.id || !result.name) { console.error('Cliente actualizado inválido:', result); throw new Error('Datos del cliente actualizado inválidos'); }
      return result;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  async deleteClient(id: number | string) {
    try {
      if (!id || isNaN(Number(id))) throw new Error('ID de cliente inválido');
      const clientId = parseInt(String(id));
      const existingClient = await clientRepository.findById(clientId);
      if (!existingClient) throw new Error('Cliente no encontrado');
      const deleted = await clientRepository.delete(clientId);
      if (!deleted) throw new Error('Error al eliminar cliente');
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  async searchClients(searchTerm: string) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) return this.getAllClients();
      const clients = await clientRepository.searchByTerm(searchTerm.trim());
      return clients.map((c: { toPlainObject: () => unknown }) => c.toPlainObject());
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
      return { data: result.data.map((c: { toPlainObject: () => unknown }) => c.toPlainObject()), pagination: result.pagination, searchTerm: result.searchTerm };
    } catch (error) {
      console.error('Error al obtener clientes paginados:', error);
      throw new Error('Error al obtener clientes paginados');
    }
  }
}

export default new ClientService();
