import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button, Input, Label } from '@/components/ui';
import { X, DollarSign, Loader, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentsApiService } from '../PaymentsApiService';
import { SimpleOrdersApiService } from '../../simple-orders/SimpleOrdersApiService';
import { createPaymentSchema, type CreatePaymentForm, type Payment } from '../types';
import { extractErrorMessage } from '@/utils/errorHandling';
import { isoToDateInputMX, todayDateInputMX, preserveTimeOrStartOfDay } from '@/utils/dateUtils';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  orderTotal: number;
  currentPayments: number;
  onPaymentCreated: (payment: Payment) => void;
  clientName: string;
  isSimpleOrder?: boolean;
}

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  currentPayments,
  onPaymentCreated,
  clientName,
  isSimpleOrder = false,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePaymentForm>({
    orderId: orderId,
    amount: 0,
    date: todayDateInputMX(),
    descripcion: ''
  });

  const pendingAmount = orderTotal - currentPayments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar con zod
      const validatedData = createPaymentSchema.parse({
        ...formData,
        date: preserveTimeOrStartOfDay(formData.date || ''),
        orderId: orderId
      });

      // Verificar que el monto no exceda lo pendiente
      if (validatedData.amount > pendingAmount) {
        setError(`El monto no puede exceder el pendiente: $${pendingAmount.toFixed(2)}`);
        setLoading(false);
        return;
      }

      let newPayment: any;
      if (isSimpleOrder) {
        if (!user?.id) {
          setError('Atención: No se ha detectado el usuario activo');
          setLoading(false);
          return;
        }
        newPayment = await SimpleOrdersApiService.addPayment({
          simple_order_id: orderId,
          user_id: user.id,
          amount: validatedData.amount,
          date: validatedData.date,
          descripcion: validatedData.descripcion
        });
      } else {
        newPayment = await PaymentsApiService.create(validatedData);
      }
      
      console.log('Pago creado:', newPayment);
      
      toast.success('Pago registrado exitosamente');
      onPaymentCreated(newPayment);
      handleClose();
    } catch (err) {
      console.error('Error creating payment:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error('Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      orderId: orderId,
      amount: 0,
      date: todayDateInputMX(),
      descripcion: ''
    });
    setError(null);
    onClose();
  };

  const handleQuickAmount = (percentage: number) => {
    const amount = pendingAmount * (percentage / 100);
    setFormData(prev => ({ ...prev, amount: Math.round(amount * 100) / 100 }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Registrar Pago</h2>
              <p className="text-sm text-gray-500">Orden #{orderId} - {clientName}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Resumen de la orden */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Resumen de la Orden</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total de la orden:</span>
                <p className="font-semibold text-gray-900">${orderTotal.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Total pagado:</span>
                <p className="font-semibold text-green-600">${currentPayments.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Monto pendiente:</span>
                <p className="font-semibold text-orange-600">${pendingAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Botones de monto rápido */}
          {pendingAmount > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Monto rápido:
              </Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(25)}
                  className="text-xs"
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(50)}
                  className="text-xs"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(75)}
                  className="text-xs"
                >
                  75%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(100)}
                  className="text-xs"
                >
                  100%
                </Button>
              </div>
            </div>
          )}

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
                max={pendingAmount}
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
            {pendingAmount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ${pendingAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
              Fecha del Pago
            </Label>
            <div className="mt-1 relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="date"
                type="date"
                value={isoToDateInputMX(formData.date)}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, date: e.target.value }));
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Metodo de Pago */}
          <div>
            <Label htmlFor="metodoPago" className="text-sm font-medium text-gray-700">
              Método de Pago *
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              disabled={loading || formData.amount <= 0 || formData.amount > pendingAmount}
              className="flex items-center gap-2"
            >
              {loading && <Loader className="animate-spin" size={16} />}
              Registrar Pago
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePaymentModal;