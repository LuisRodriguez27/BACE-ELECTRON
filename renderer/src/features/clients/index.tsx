import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Users, Phone, MapPin, Edit3, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientApiService } from './ClientApiService';
import { CreateClientModal, EditClientModal, DeleteClientModal, ClientColorIndicator, ClientOrdersModal } from './components';
import { toast } from 'sonner';
import type { Client } from './types';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (showSuccessToast = false) => {
    try {
      setLoading(true);
      const data = await ClientApiService.findAll();
      setClients(data);
      setError(null);
      if (showSuccessToast) {
        toast.success('Clientes cargados exitosamente');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar clientes');
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client && client.name && (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm)) ||
      (client.address && client.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const handleClientCreated = (newClient: Client) => {
    setClients(prevClients => [...prevClients, newClient]);
    toast.success('Cliente creado exitosamente');
  };

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prevClients =>
      prevClients.map(client =>
        client.id === updatedClient.id ? updatedClient : client
      )
    );
    // Toast se maneja desde el modal
  };

  const handleClientDeleted = (deletedClientId: number) => {
    const deletedClient = clients.find(client => client.id === deletedClientId);
    setClients(prevClients =>
      prevClients.filter(client => client.id !== deletedClientId)
    );
    toast.success('Cliente eliminado exitosamente', {
      description: deletedClient ? `${deletedClient.name} ha sido eliminado de la lista` : 'El cliente ha sido eliminado'
    });
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const openOrdersModal = (client: Client) => {
    setSelectedClient(client);
    setShowOrdersModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowOrdersModal(false);
    setSelectedClient(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={() => fetchClients(true)} 
            className="mt-2"
            size="sm"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-2">
            Administra la información de tus clientes
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </Button>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Clientes ({filteredClients.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? `No hay clientes que coincidan con "${searchTerm}"` 
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
              {!searchTerm && (
                <Button 
                  className="flex items-center gap-2 mx-auto"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Agregar Primer Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ClientColorIndicator color={client.color} size="md" />
                      <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openOrdersModal(client)}
                        className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Ver órdenes"
                      >
                        <ShoppingBag size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal(client)}
                        className="p-1 h-8 w-8"
                        title="Editar cliente"
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDeleteModal(client)}
                        className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Eliminar cliente"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      <span>{client.phone}</span>
                    </div>
                    
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                    
                    {client.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {client.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onClientCreated={handleClientCreated}
      />

      <EditClientModal
        isOpen={showEditModal}
        onClose={closeModals}
        onClientUpdated={handleClientUpdated}
        client={selectedClient}
      />

      <DeleteClientModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onClientDeleted={handleClientDeleted}
        client={selectedClient}
      />

      <ClientOrdersModal
        isOpen={showOrdersModal}
        onClose={closeModals}
        client={selectedClient}
      />
    </div>
  );
};

export default ClientsPage;
