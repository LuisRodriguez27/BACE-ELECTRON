import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader, User, Phone, Mail, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuppliersApiService } from '../SuppliersApiService';
import type { Supplier } from '../types';

interface DeleteSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierDeleted: (supplierId: number) => void;
  supplier: Supplier | null;
}

const DeleteSupplierModal: React.FC<DeleteSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierDeleted,
  supplier
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!supplier) return;

    try {
      setIsDeleting(true);
      setError(null);

      await SuppliersApiService.delete(supplier.id);
      onSupplierDeleted(supplier.id);
      onClose();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Error al eliminar el proveedor. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !supplier) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Proveedor</h2>
              <p className="text-sm text-gray-500">Esta acción desactivará al proveedor</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Supplier Info Card */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{supplier.name}</h3>
                  <p className="text-xs text-gray-500">Proveedor #{supplier.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                )}

                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}

                {supplier.columns && (
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{supplier.columns}</span>
                  </div>
                )}

                {supplier.description && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    <p className="line-clamp-2">{supplier.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Banner */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">¿Estás seguro de que quieres continuar?</h4>
                  <p className="text-yellow-700 mt-1">
                    El proveedor ya no estará disponible para realizar nuevas órdenes, pero su historial de órdenes existente se conservará en el sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
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
                  Desactivar Proveedor
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSupplierModal;
