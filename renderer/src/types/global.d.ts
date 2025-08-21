import { Client, CreateClientForm, EditClientForm } from "./types";

declare global {
  interface Window {
    api: {
      

      // Clientes
      getAllClients: () => Promise<Client[]>;
      getClientById: (id: number) => Promise<Client>;
      createClient: (data: CreateClientForm) => Promise<Client>;
      updateClient: (id: number, data: EditClientForm) => Promise<Client>;
      deleteClient: (id: number) => Promise<void>;
    };
  }
}

export {};
