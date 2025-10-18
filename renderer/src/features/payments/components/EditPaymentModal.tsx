import { Button, Input, Label } from '@/components/ui';
import { extractErrorMessage } from '@/utils/errorHandling';
import { DollarSign, FileText, Loader, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PaymentsApiService } from '../PaymentsApiService';
import { editPaymentSchema, type EditPaymentForm, type Payment } from '../types';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  orderTotal: number;
  currentPayments: number; // Total de otros pagos (excluyendo el actual)
  onPaymentUpdated: (payment: Payment) => void;
  onPaymentDeleted: (paymentId: number) => void;
  clientName: string;
}

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  orderTotal,
  currentPayments,
  onPaymentUpdated,
  onPaymentDeleted,
  clientName
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<EditPaymentForm>({
    amount: 0,
    descripcion: ''
  });

  const pendingAmount = orderTotal - currentPayments;

  useEffect(() => {
    if (payment && isOpen) {
      setFormData({
        amount: payment.amount,
        descripcion: payment.descripcion || ''
      });
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [payment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;
    
    setError(null);
    setLoading(true);

    try {
      // Validar con zod
      const validatedData = editPaymentSchema.parse(formData);

      // Verificar que el nuevo monto no exceda lo disponible
      if (validatedData.amount > pendingAmount + payment.amount) {
        setError(`El monto no puede exceder el disponible: $${(pendingAmount + payment.amount).toFixed(2)}`);
        setLoading(false);
        return;
      }

      const updatedPayment = await PaymentsApiService.update(payment.id, {
        ...payment,
        ...validatedData
      });
      
      toast.success('Pago actualizado exitosamente');
      onPaymentUpdated(updatedPayment);
      handleClose();
    } catch (err) {
      console.error('Error updating payment:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error('Error al actualizar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      await PaymentsApiService.delete(payment.id);
      toast.success('Pago eliminado exitosamente');
      onPaymentDeleted(payment.id);
      handleClose();
    } catch (err) {
      console.error('Error deleting payment:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error('Error al eliminar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      amount: 0,
      descripcion: ''
    });
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !payment) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Pago</h2>
              <p className="text-sm text-gray-500">Pago #{payment.id} - {clientName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Eliminar pago?
              </h3>
              <p className="text-gray-600 mb-4">
                Esta acción no se puede deshacer. El pago será eliminado permanentemente.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-left">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Monto:</span> ${payment.amount.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Fecha:</span> {formatDate(payment.date)}
                </p>
                {payment.descripcion && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Descripción:</span> {payment.descripcion}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
              >
                {loading && <Loader className="animate-spin" size={16} />}
                Eliminar Pago
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Información del pago actual */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Información del Pago</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Fecha de registro:</span>
                  <p className="font-medium text-gray-900">{formatDate(payment.date)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Monto disponible para edición:</span>
                  <p className="font-semibold text-green-600">
                    ${(pendingAmount + payment.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Monto */}
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Monto del Pago *
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={pendingAmount + payment.amount}
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    amount: parseFloat(e.target.value) || 0 
                  }))}
                  className="pl-10"
                  placeholder="10.00"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ${(pendingAmount + payment.amount).toFixed(2)}
              </p>
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="metodoPago" className="text-sm font-medium text-gray-700">
                Método de Pago
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  id="metodoPago"
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="" hidden>Selecciona un método</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                disabled={loading}
              >
                <Trash2 size={16} />
                Eliminar
              </Button>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || formData.amount <= 0 || formData.amount > (pendingAmount + payment.amount)}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin" size={16} />}
                  Actualizar Pago
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditPaymentModal;