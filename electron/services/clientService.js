const clientRepository = require('../repositories/clientRepository');

class ClientService {

  async getAllClients() {
    try {
      const clients = await clientRepository.findAll();
      return clients.map(client => client.toPlainObject());
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw new Error('Error al obtener clientes');
    }
  }

  async getClientById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de cliente inválido');
      }

      const client = await clientRepository.findById(parseInt(id));
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      return client.toPlainObject();
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw error;
    }
  }

  async createClient({ name, phone, address, description, color }) {
    try {
      // Validaciones de negocio
      if (!name || !phone) {
        throw new Error('Nombre y teléfono son requeridos');
      }

      if (name.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
      }

      if (phone.trim().length < 10) {
        throw new Error('El teléfono debe tener al menos 10 dígitos');
      }

      // Validar que el teléfono contenga solo números, espacios, guiones y paréntesis
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) {
        throw new Error('El teléfono contiene caracteres inválidos');
      }

      // Verificar si el teléfono ya existe
      if (await clientRepository.existsByPhone(phone.trim())) {
        throw new Error('Ya existe un cliente con este teléfono');
      }

      // Crear cliente
      const client = await clientRepository.create({
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
        color: color?.trim() || null
      });

      return client.toPlainObject();

    } catch (error) {
      console.error('Error al crear cliente:', error);
      throw error;
    }
  }

  async updateClient(id, { name, phone, address, description, color }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de cliente inválido');
      }

      if (!name || !phone) {
        throw new Error('Nombre y teléfono son requeridos');
      }

      if (name.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
      }

      if (phone.trim().length < 10) {
        throw new Error('El teléfono debe tener al menos 10 dígitos');
      }

      const clientId = parseInt(id);

      // Verificar si el cliente existe
      const existingClient = await clientRepository.findById(clientId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }

      // Validar que el teléfono contenga solo números, espacios, guiones y paréntesis
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(phone.trim())) {
        throw new Error('El teléfono contiene caracteres inválidos');
      }

      // Verificar si el teléfono ya está en uso por otro cliente
      if (await clientRepository.existsByPhone(phone.trim(), clientId)) {
        throw new Error('Ya existe otro cliente con este teléfono');
      }

      // Actualizar cliente
      const updated = await clientRepository.update(clientId, {
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || null,
        description: description?.trim() || null,
        color: color?.trim() || null
      });

      if (!updated) {
        throw new Error('Error al actualizar cliente');
      }

      // Obtener cliente actualizado
      const updatedClient = await clientRepository.findById(clientId);
      
      if (!updatedClient) {
        throw new Error('Error: no se pudo recuperar el cliente actualizado');
      }
      
      const result = updatedClient.toPlainObject();
      
      // Validar que el resultado tenga las propiedades necesarias
      if (!result.id || !result.name) {
        console.error('Cliente actualizado inválido:', result);
        throw new Error('Datos del cliente actualizado inválidos');
      }
      
      return result;
      
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('ID de cliente inválido');
      }

      const clientId = parseInt(id);

      const existingClient = await clientRepository.findById(clientId);
      if (!existingClient) {
        throw new Error('Cliente no encontrado');
      }

      const deleted = await clientRepository.delete(clientId);

      if (!deleted) {
        throw new Error('Error al eliminar cliente');
      }

    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  async searchClients(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAllClients();
      }

      const clients = await clientRepository.searchByTerm(searchTerm.trim());
      return clients.map(client => client.toPlainObject());
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      throw new Error('Error al buscar clientes');
    }
  }
}

module.exports = new ClientService();
