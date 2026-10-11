import type { Client, CreateClientForm, EditClientForm } from "./types";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  searchTerm?: string;
}

export const ClientApiService = {
  findAll: async (): Promise<Client[]> => {
    return window.api.getAllClients();
  },

  findAllInvested: async (): Promise<Client[]> => {
    return window.api.getAllInvestedClients();
  },

  findById: async (id: number): Promise<Client> => {
    return window.api.getClientById(id);
  },

  findPaginated: async (page: number, limit: number, searchTerm: string = ''): Promise<PaginatedResponse<Client>> => {
    return window.api.getClientsPaginated(page, limit, searchTerm);
  },

  create: async (client: CreateClientForm): Promise<Client> => {
    return window.api.createClient(client);
  },

  update: async (id: number, client: EditClientForm): Promise<Client> => {
    return window.api.updateClient(id, client);
  },

  delete: async (id: number): Promise<any> => {
    return window.api.deleteClient(id);
  }

};
