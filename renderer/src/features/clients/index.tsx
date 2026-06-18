import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { Calculator, CreditCard, Edit3, Loader2, MapPin, MessageCircle, MoreVertical, Phone, Plus, Printer, Search, ShoppingBag, Trash2, Users } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ClientApiService } from './ClientApiService';
import { ClientColorIndicator, ClientOrdersModal, ClientPaymentsModal, CreateClientModal, DeleteClientModal, EditClientModal, ClientBudgetModal } from './components';
import { useWhatsAppClient } from './hooks/useWhatsAppClient';
import type { Client } from './types';
import { formatDateMX, nowISO } from '@/utils/dateUtils';
import { generateClientsPrintHtml } from './logbook';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<number | null>(null);
  const { checkPermission } = usePermissions();
  const { sendWhatsApp, whatsappDialogElement } = useWhatsAppClient();
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastClientElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasNext) {
        loadMoreClients();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, pagination.hasNext]);

  const loadClients = async (page: number = 1, reset: boolean = true, searchQuery: string = '') => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await ClientApiService.findPaginated(page, 10, searchQuery);
      
      if (reset) {
        setClients(response.data);
      } else {
        setClients(prev => [...prev, ...response.data]);
      }
      
      setPagination(response.pagination);
      setCurrentSearchTerm(searchQuery);
      setError(null);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar clientes');
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreClients = () => {
    if (!loadingMore && pagination.hasNext) {
      loadClients(pagination.page + 1, false, currentSearchTerm);
    }
  };

  useEffect(() => {
    loadClients(1, true, '');
  }, []);

  // Manejar búsqueda con debounce
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = window.setTimeout(() => {
      if (searchTerm !== currentSearchTerm) {
        loadClients(1, true, searchTerm);
      }
    }, 500); // Debounce de 500ms

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleClientCreated = (newClient: Client) => {
    setClients(prevClients => [newClient, ...prevClients]);
    setPagination(prev => ({
      ...prev,
      total: prev.total + 1
    }));
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
    setPagination(prev => ({
      ...prev,
      total: Math.max(0, prev.total - 1)
    }));
    toast.success('Cliente eliminado exitosamente', {
      description: deletedClient ? `${deletedClient.name} ha sido eliminado de la lista` : 'El cliente ha sido eliminado'
    });
  };

  const openEditModal = (client: Client) => {
    if (!checkPermission("Editar Cliente")) {
      return;
    }
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const openDeleteModal = (client: Client) => {
    if (!checkPermission("Eliminar Cliente")) {
      return;
    }
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const openBudgetModal = (client: Client) => {
    setSelectedClient(client);
    setShowBudgetModal(true);
  }

  const openOrdersModal = (client: Client) => {
    setSelectedClient(client);
    setShowOrdersModal(true);
  };

  const openPaymentsModal = (client: Client) => {
    setSelectedClient(client);
    setShowPaymentsModal(true);
  };

  const openCreateModal = () => {
    if (!checkPermission("Crear Cliente")) {
      return;
    }
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowOrdersModal(false);
    setShowPaymentsModal(false);
    setShowBudgetModal(false);
    setSelectedClient(null);
    setOpenDropdownId(null);
  };

  const handlePrintClients = async () => {
    try {
      const allInvestedClients = await ClientApiService.findAllInvested();
      
      const filteredInvested = allInvestedClients.filter(client =>
        client && client.name && (
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.phone && client.phone.includes(searchTerm)) ||
          (client.address && client.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
          client.id.toString().includes(searchTerm)
        )
      );

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Por favor permite ventanas emergentes para imprimir');
        return;
      }

      const currentDate = formatDateMX(nowISO(), 'dddd, D [de] MMMM [de] YYYY');
      const htmlContent = generateClientsPrintHtml(filteredInvested, currentDate);

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Error al imprimir clientes:', err);
      toast.error('Error al intentar imprimir la lista de clientes');
    }
  };



  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={() => loadClients(1, true, currentSearchTerm)} 
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
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700"
            onClick={handlePrintClients}
            title="Imprimir Directorio de Clientes"
          >
            <Printer size={16} />
            Imprimir
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar clientes por nombre, teléfono, dirección o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Clientes ({pagination.total})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              {currentSearchTerm ? (
                <>
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
                  <p className="text-gray-500 mb-4">
                    No hay clientes que coincidan con "<strong>{currentSearchTerm}</strong>"
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    size="sm"
                  >
                    Limpiar búsqueda
                  </Button>
                </>
              ) : (
                <>
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
                  <p className="text-gray-500 mb-4">
                    Comienza agregando tu primer cliente
                  </p>
                  <Button 
                    className="flex items-center gap-2 mx-auto"
                    onClick={openCreateModal}
                  >
                    <Plus size={16} />
                    Agregar Primer Cliente
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client, index) => (
                  <div 
                    key={client.id} 
                    ref={index === clients.length - 1 ? lastClientElementRef : null}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h2 className="text-sm text-gray-500 truncate">Identificador Unico: {client.id}</h2>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ClientColorIndicator color={client.color} size="md" />
                        <h3 className="font-semibold text-gray-900 truncate" title={client.name}>{client.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendWhatsApp(client)}
                          className="p-1 h-8 w-8 text-[#25D366] hover:text-[#1ebe5d] hover:bg-green-50"
                          title="Enviar mensaje de bienvenida por WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </Button>
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
                          onClick={() => openPaymentsModal(client)}
                          className="p-1 h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Ver pagos"
                        >
                          <CreditCard size={14} />
                        </Button>

                        {/* Dropdown for More Actions */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === client.id ? null : client.id);
                            }}
                            className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            title="Más acciones"
                          >
                            <MoreVertical size={14} />
                          </Button>

                          {openDropdownId === client.id && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              
                              {/* Menu items */}
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-40 origin-top-right text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    openBudgetModal(client);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Calculator size={14} className="text-gray-400" />
                                  Ver presupuesto
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openEditModal(client);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Edit3 size={14} className="text-gray-400" />
                                  Editar cliente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openDeleteModal(client);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} className="text-red-400" />
                                  Eliminar cliente
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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

              {/* Loading indicator para scroll infinito */}
              {loadingMore && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Cargando más clientes...</span>
                </div>
              )}

              {/* Mensaje cuando se han cargado todos los clientes */}
              {!loadingMore && !pagination.hasNext && clients.length > 0 && (
                <div className="text-center py-8 border-t border-gray-100 mt-6">
                  <p className="text-gray-500">
                    {currentSearchTerm 
                      ? `Se encontraron ${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${currentSearchTerm}"`
                      : `Has visto todos los clientes (${pagination.total})`
                    }
                  </p>
                </div>
              )}
            </>
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

      <ClientBudgetModal
        isOpen={showBudgetModal}
        onClose={closeModals}
        client={selectedClient}
      />

      <ClientOrdersModal
        isOpen={showOrdersModal}
        onClose={closeModals}
        client={selectedClient}
      />

      <ClientPaymentsModal
        isOpen={showPaymentsModal}
        onClose={closeModals}
        client={selectedClient}
      />
      {whatsappDialogElement}
    </div>
  );
};

export default ClientsPage;
