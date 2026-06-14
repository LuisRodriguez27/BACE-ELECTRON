import { useState, useEffect, useCallback } from 'react';
import type { Client } from '@/features/clients/types';
import type { UseFormSetValue, UseFormUnregister } from 'react-hook-form';
import { ClientApiService } from '../ClientApiService';

export interface UseClientSearchOptions {
  setValue: UseFormSetValue<any>;
  unregister: UseFormUnregister<any>;
}

export interface UseClientSearchReturn {
  clients: Client[];
  loadingClients: boolean;
  clientSearchTerm: string;
  setClientSearchTerm: (term: string) => void;
  showClientDropdown: boolean;
  setShowClientDropdown: (show: boolean) => void;
  selectedClientId: number | null;
  setSelectedClientId: (id: number | null) => void;
  highlightClient: boolean;
  loadClients: () => Promise<void>;
  getFilteredClients: () => Client[];
  selectClient: (client: Client) => void;
  handleClientCreated: (newClient: Client) => void;
  handleClientInputChange: (searchTerm: string) => void;
  reset: () => void;
}

export const useClientSearch = ({ setValue, unregister }: UseClientSearchOptions): UseClientSearchReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [highlightClient, setHighlightClient] = useState(false);

  // Efecto para sincronizar el cliente seleccionado con el estado de búsqueda y recuperarlo si no está en la lista
  useEffect(() => {
    if (selectedClientId) {
      const exists = clients.some(c => c.id === selectedClientId);
      if (!exists) {
        ClientApiService.findById(selectedClientId)
          .then(client => {
            if (client) {
              setClients(prev => {
                if (prev.some(c => c.id === client.id)) return prev;
                return [client, ...prev];
              });
              setClientSearchTerm(`${client.name} - ${client.phone}`);
            }
          })
          .catch(err => console.error('Error al recuperar cliente por ID en buscador:', err));
      } else {
        const selectedClient = clients.find(c => c.id === selectedClientId);
        if (selectedClient && clientSearchTerm !== `${selectedClient.name} - ${selectedClient.phone}`) {
          setClientSearchTerm(`${selectedClient.name} - ${selectedClient.phone}`);
        }
      }
    }
  }, [selectedClientId, clients, clientSearchTerm]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const clientDropdown = document.getElementById('client-dropdown');
      const clientInput = document.getElementById('client-search-input');

      if (clientDropdown && showClientDropdown) {
        const isClickInsideClientDropdown = clientDropdown.contains(target);
        const isClickInsideClientInput = clientInput?.contains(target);

        if (!isClickInsideClientDropdown && !isClickInsideClientInput) {
          setShowClientDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientDropdown]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await ClientApiService.findPaginated(1, 20, '');
      setClients(prev => {
        const matched = response.data;
        if (selectedClientId) {
          const selectedClient = prev.find(c => c.id === selectedClientId);
          if (selectedClient && !matched.some(c => c.id === selectedClientId)) {
            return [selectedClient, ...matched];
          }
        }
        return matched;
      });
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  // Manejar la búsqueda en base de datos con debounce
  useEffect(() => {
    if (!clientSearchTerm || clientSearchTerm.trim() === '') {
      if (!selectedClientId) {
        loadClients();
      }
      return;
    }

    if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient && clientSearchTerm === `${selectedClient.name} - ${selectedClient.phone}`) {
        return;
      }
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingClients(true);
        const response = await ClientApiService.findPaginated(1, 20, clientSearchTerm);
        setClients(prev => {
          const matched = response.data;
          if (selectedClientId) {
            const selectedClient = prev.find(c => c.id === selectedClientId);
            if (selectedClient && !matched.some(c => c.id === selectedClientId)) {
              return [selectedClient, ...matched];
            }
          }
          return matched;
        });
      } catch (err) {
        console.error('Error searching clients in hook:', err);
      } finally {
        setLoadingClients(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [clientSearchTerm, selectedClientId]);

  const getFilteredClients = useCallback(() => {
    // Como ya vienen filtrados del backend, solo los devolvemos ordenados por ID
    return [...clients].sort((a, b) => a.id - b.id);
  }, [clients]);

  const selectClient = useCallback((client: Client) => {
    setValue('client_id', client.id);
    setSelectedClientId(client.id);
    setClientSearchTerm(`${client.name} - ${client.phone}`);
    setShowClientDropdown(false);
  }, [setValue]);

  const handleClientCreated = useCallback((newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    // Seleccionar automáticamente el cliente recién creado
    setValue('client_id', newClient.id);
    setSelectedClientId(newClient.id);
    setClientSearchTerm(`${newClient.name} - ${newClient.phone}`);
    setShowClientDropdown(false);
    // Activar efecto de highlight
    setHighlightClient(true);
    setTimeout(() => setHighlightClient(false), 3000);
  }, [setValue]);

  const handleClientInputChange = useCallback((searchTerm: string) => {
    setClientSearchTerm(searchTerm);
    setShowClientDropdown(true);

    // Si el texto no coincide con el cliente seleccionado, limpiar la selección
    if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient && searchTerm !== `${selectedClient.name} - ${selectedClient.phone}`) {
        setSelectedClientId(null);
        unregister('client_id');
      }
    }
  }, [selectedClientId, clients, unregister]);

  const reset = useCallback(() => {
    setClientSearchTerm('');
    setShowClientDropdown(false);
    setSelectedClientId(null);
    setHighlightClient(false);
  }, []);

  return {
    clients,
    loadingClients,
    clientSearchTerm,
    setClientSearchTerm,
    showClientDropdown,
    setShowClientDropdown,
    selectedClientId,
    setSelectedClientId,
    highlightClient,
    loadClients,
    getFilteredClients,
    selectClient,
    handleClientCreated,
    handleClientInputChange,
    reset,
  };
};
