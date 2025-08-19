export interface Client {
  id?: number;
  name: string;
  phone?: string;
  address?: string;
  description?: string;
}

export interface IElectronAPI {
  getAllClients: () => Promise<Client[]>;
  getClientById: (id: number) => Promise<Client>;
  createClient: (client: Omit<Client, 'id'>) => Promise<{ id: number; name: string }>;
  updateClient: (id: number, name: string, phone?: string, address?: string, description?: string) => Promise<any>;
  deleteClient: (id: number) => Promise<any>;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}

export {};
