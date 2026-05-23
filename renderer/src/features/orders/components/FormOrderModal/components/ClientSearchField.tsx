import React from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Loader, Plus, Search, User } from 'lucide-react';

import type { UseClientSearchReturn } from '@/features/clients/hooks/useClientSearch';
import type { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';

interface ClientSearchFieldProps {
  clientSearch: UseClientSearchReturn;
  register: UseFormRegister<any>;
  errors: FieldErrors<FieldValues>;
  onOpenCreateClientModal: () => void;
}

const ClientSearchField: React.FC<ClientSearchFieldProps> = ({
  clientSearch,
  register,
  errors,
  onOpenCreateClientModal,
}) => {
  const {
    clients,
    loadingClients,
    clientSearchTerm,
    showClientDropdown,
    setShowClientDropdown,
    selectedClientId,
    highlightClient,
    getFilteredClients,
    selectClient,
    handleClientInputChange,
  } = clientSearch;

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <Label htmlFor="client_id" className="text-sm font-medium text-gray-700">
          Cliente *
        </Label>
        <Button
          type="button"
          onClick={onOpenCreateClientModal}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs px-3 py-1 h-7 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <User size={12} />
          Nuevo Cliente
        </Button>
      </div>
      <div className="mt-1">
        {loadingClients ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <Loader className="animate-spin" size={16} />
            <span className="text-sm text-gray-500">Cargando clientes...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-between p-3 border border-dashed border-gray-300 rounded-lg">
            <div className="flex items-center gap-2 text-gray-500">
              <User size={16} />
              <span className="text-sm">No hay clientes registrados</span>
            </div>
            <Button
              type="button"
              onClick={onOpenCreateClientModal}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus size={14} />
              Crear Primer Cliente
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
              <Input
                id="client-search-input"
                type="text"
                placeholder="Buscar cliente por nombre, teléfono o ID..."
                value={clientSearchTerm}
                onChange={(e) => handleClientInputChange(e.target.value)}
                onFocus={() => setShowClientDropdown(true)}
                className={`pl-10 pr-4 transition-all duration-500 ${
                  highlightClient
                    ? 'border-green-400 bg-green-50 shadow-md ring-2 ring-green-200'
                    : 'border-gray-300'
                }`}
              />
              {/* Hidden input for form validation */}
              {selectedClientId && (
                <input
                  type="hidden"
                  {...register('client_id', {
                    valueAsNumber: true,
                    required: 'Debe seleccionar un cliente'
                  })}
                  value={selectedClientId}
                />
              )}
            </div>

            {/* Dropdown de clientes */}
            {showClientDropdown && (
              <div
                id="client-dropdown"
                className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                {getFilteredClients().length > 0 ? (
                  getFilteredClients().map((client) => (
                    <div
                      key={client.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 group"
                      onClick={() => selectClient(client)}
                    >
                      <div className="flex items-center gap-2">
                        {client.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: client.color }}
                          />
                        )}
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-500">
                            ID: {client.id}
                          </div>
                          <div className="font-medium text-sm text-gray-900">
                            {client.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {client.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mb-2">No se encontraron clientes</p>
                      {clientSearchTerm && (
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleClientInputChange('');
                              setShowClientDropdown(true);
                            }}
                            className="text-xs"
                          >
                            Limpiar búsqueda
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onOpenCreateClientModal();
                              setShowClientDropdown(false);
                            }}
                            className="text-xs"
                          >
                            <Plus size={12} className="mr-1" />
                            Crear cliente
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {errors.client_id && (
        <p className="mt-1 text-sm text-red-600">{errors.client_id.message as string}</p>
      )}
    </div>
  );
};

export default ClientSearchField;
