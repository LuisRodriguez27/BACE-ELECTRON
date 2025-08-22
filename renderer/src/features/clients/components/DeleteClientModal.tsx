import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientApiService } from '../ClientApiService';
import type { Client } from '../types';

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientDeleted: (clientId: number) => void;
  client: Client | null;
}

const DeleteClientModal: React.FC<DeleteClientModalProps> = ({ 
  isOpen, 
  onClose, 
  onClientDeleted,
  client
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!client) return;

    try {
      setIsDeleting(true);
      setError(null);
      
      await ClientApiService.delete(client.id);
      onClientDeleted(client.id);
      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Error al eliminar el cliente. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !client) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Cliente</h2>
              <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Client Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-500">
                    Cliente #{client.id}
                  </p>
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
                    <span>{client.address}</span>
                  </div>
                )}
                
                {client.description && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      {client.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Text */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    ¿Estás seguro de que quieres eliminar este cliente?
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Esta acción eliminará permanentemente el cliente y toda su información asociada. 
                    No podrás recuperar estos datos después de la eliminación.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation List */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Al eliminar este cliente:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Se eliminará toda su información de contacto
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  Se removerá su historial de pedidos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  No podrá ser recuperado posteriormente
                </li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Eliminar Cliente
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteClientModal;
