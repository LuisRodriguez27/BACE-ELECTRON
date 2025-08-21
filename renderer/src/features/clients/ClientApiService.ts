import type { Client, CreateClientForm, EditClientForm } from "./types";

export const ClientApiService = {
  findAll: async (): Promise<Client[]> => {
    return window.api.getAllClients();
  },

  findById: async (id: number): Promise<Client> => {
    return window.api.getClientById(id);
  },

  create: async (client: CreateClientForm): Promise<{ id: number; name: string }> => {
    return window.api.createClient(client);
  },

  update: async (id: number, client: EditClientForm): Promise<any> => {
    return window.api.updateClient(id, client);
  },

  delete: async (id: number): Promise<any> => {
    return window.api.deleteClient(id);
  }

};
