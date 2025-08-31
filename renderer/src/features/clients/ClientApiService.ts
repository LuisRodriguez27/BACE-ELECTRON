import type { Client, CreateClientForm, EditClientForm } from "./types";

export const ClientApiService = {
  findAll: async (): Promise<Client[]> => {
    return window.api.getAllClients();
  },

  findById: async (id: number): Promise<Client> => {
    return window.api.getClientById(id);
  },

  create: async (client: CreateClientForm): Promise<Client> => {
    return window.api.createClient(client);
  },

  update: async (id: number, client: EditClientForm): Promise<Client> => {
    const result: any = await window.api.updateClient(id, client);
    return result.data; // Extraer el cliente de la respuesta
  },

  delete: async (id: number): Promise<any> => {
    return window.api.deleteClient(id);
  }

};
