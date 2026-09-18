import React, { useEffect } from 'react';
import { Input, Label } from '@/components/ui';
import { Loader, User } from 'lucide-react';
import { useClientSearch } from '@/features/clients/hooks/useClientSearch';
import type { Client } from '@/features/clients/types';

interface SimpleOrderClientFieldsProps {
  isOpen: boolean;
  clientName: string;
  clientPhone: string;
  onClientNameChange: (value: string) => void;
  onClientPhoneChange: (value: string) => void;
  idPrefix: string;
}

const SimpleOrderClientFields: React.FC<SimpleOrderClientFieldsProps> = ({
  isOpen,
  clientName,
  clientPhone,
  onClientNameChange,
  onClientPhoneChange,
  idPrefix,
}) => {
  const dropdownId = `${idPrefix}-client-dropdown`;
  const containerId = `${idPrefix}-client-search`;
  const clientSearch = useClientSearch({
    dropdownId,
    containerId,
    onSelectClient: (client: Client) => {
      onClientNameChange(client.name);
      onClientPhoneChange(client.phone);
    },
  });

  useEffect(() => {
    if (isOpen) {
      clientSearch.loadClients();
    } else {
      clientSearch.reset();
    }
  }, [isOpen]);

  const handleNameChange = (value: string) => {
    onClientNameChange(value);
    clientSearch.handleClientInputChange(value);
  };

  const handlePhoneChange = (value: string) => {
    const phone = value.replace(/\D/g, '').slice(0, 10);
    onClientPhoneChange(phone);
    clientSearch.handleClientInputChange(phone);
  };

  const matchingClients = clientSearch.getFilteredClients();

  return (
    <div id={containerId} className="space-y-4 relative">
      <div>
        <Label htmlFor={`${idPrefix}-client-name`} className="mb-1 block font-medium">
          Nombre del Cliente <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
        </Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-client-name`}
            value={clientName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => clientSearch.setShowClientDropdown(true)}
            placeholder="Nombre de la persona (para tickets / búsquedas)"
          />
          {clientSearch.loadingClients && (
            <Loader className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={16} />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-client-phone`} className="mb-1 block font-medium">
          Teléfono del Cliente <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
        </Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-client-phone`}
            type="tel"
            maxLength={10}
            value={clientPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onFocus={() => clientSearch.setShowClientDropdown(true)}
            placeholder="Teléfono del cliente..."
          />
        </div>
      </div>

      {clientSearch.showClientDropdown && (
        <div
          id={dropdownId}
          className="absolute z-50 top-full -mt-2 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {matchingClients.length > 0 ? (
            matchingClients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                onClick={() => clientSearch.selectClient(client)}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.phone}</div>
                  </div>
                </div>
              </button>
            ))
          ) : !clientSearch.loadingClients ? (
            <p className="px-3 py-4 text-center text-sm text-gray-500">No se encontraron clientes</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SimpleOrderClientFields;
