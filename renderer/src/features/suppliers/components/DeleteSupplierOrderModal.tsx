import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuppliersApiService } from '../SuppliersApiService';
import type { SupplierOrder } from '../types';
import { formatDateMX } from '@/utils/dateUtils';

interface DeleteSupplierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderDeleted: (orderId: number) => void;
  order: SupplierOrder | null;
}

const DeleteSupplierOrderModal: React.FC<DeleteSupplierOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderDeleted,
  order
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!order) return;

    try {
      setIsDeleting(true);
      setError(null);

      await SuppliersApiService.deleteOrder(order.id);
      onOrderDeleted(order.id);
      onClose();
    } catch (err) {
      console.error('Error deleting supplier order:', err);
      setError('Error al eliminar el pedido de proveedor. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !order) return null;

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
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Pedido de Proveedor</h2>
              <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
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
            {/* Order Info Card */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  Pedido #{order.id}
                </h3>
                <p className="text-xs text-gray-500">
                  Proveedor: {order.supplier_name || `ID #${order.supplier_id}`}
                </p>
              </div>

              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <span>Fecha: {formatDateMX(order.date, 'DD/MM/YYYY')}</span>
                </div>

                {order.notes && (
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{order.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Confirmation Warning */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <p className="text-yellow-700">
                Se eliminará el pedido y todo su desglose de artículos de forma permanente de la base de datos.
              </p>
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
                  Eliminar Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteSupplierOrderModal;
