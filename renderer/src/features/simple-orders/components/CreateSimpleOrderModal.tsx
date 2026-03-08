import React, { useState } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { X, DollarSign, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleOrdersApiService } from '../SimpleOrdersApiService';
import { useAuthStore } from '@/store/auth';

interface CreateSimpleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

const CreateSimpleOrderModal: React.FC<CreateSimpleOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [concept, setConcept] = useState('');
  const [total, setTotal] = useState<number | ''>('');
  const [abono, setAbono] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('No hay un usuario activo detectado');
      return;
    }

    if (!concept.trim()) {
      setError('El concepto es obligatorio');
      return;
    }

    if (total === '' || total <= 0) {
      setError('El total debe ser mayor a 0');
      return;
    }

    const initialPayment = abono === '' ? 0 : abono;

    if (initialPayment > total) {
      setError('El abono inicial no puede ser mayor al total de la orden');
      return;
    }

    if (initialPayment > 0 && !paymentMethod) {
      setError('Debe seleccionar un método de pago para el abono inicial');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Crear Orden rápida
      const respOrder = await SimpleOrdersApiService.create({
        user_id: user.id,
        concept,
        total: Number(total),
      });

      // 2. Si hay abono inicial, creamos el pago automáticamente
      if (initialPayment > 0) {
        await SimpleOrdersApiService.addPayment({
          simple_order_id: respOrder.id,
          user_id: user.id,
          amount: Number(initialPayment),
          descripcion: paymentMethod
        });
      }

      toast.success('Orden rápida registrada exitosamente');
      onOrderCreated();
      handleClose();
    } catch (err: any) {
      console.error('Error creating simple order:', err);
      setError(err.message || 'Error al guardar la orden.');
      toast.error('Error al registrar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConcept('');
    setTotal('');
    setAbono('');
    setPaymentMethod('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nueva Orden Rápida</h2>
              <p className="text-sm text-gray-500">Registra ventas que no ocupan clientes o detalles largos</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Concepto */}
          <div>
            <Label htmlFor="concept" className="text-sm font-medium text-gray-700">
              Concepto / Descripción *
            </Label>
            <div className="mt-1 relative">
              <textarea
                id="concept"
                rows={3}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ej. Impresión de 50 hojas a color, diseño por maquila..."
                required
              />
            </div>
          </div>

          {/* Total */}
          <div>
            <Label htmlFor="total" className="text-sm font-medium text-gray-700">
              Total a cobrar ($) *
            </Label>
            <div className="mt-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="total"
                type="number"
                step="0.01"
                min="0.01"
                value={total}
                onChange={(e) => setTotal(parseFloat(e.target.value) || '')}
                className="pl-10"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Abono Inicial */}
          <div>
            <Label htmlFor="abono" className="text-sm font-medium text-gray-700">
              Abono Inicial (Opcional $)
            </Label>
            <div className="mt-1 relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                id="abono"
                type="number"
                step="0.01"
                min="0"
                max={total !== '' ? total : undefined}
                value={abono}
                onChange={(e) => {
                  setAbono(parseFloat(e.target.value) || '');
                  if (!e.target.value || parseFloat(e.target.value) === 0) {
                    setPaymentMethod('');
                  }
                }}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Si el cliente liquida de inmediato, ingresa el total aquí.
            </p>
          </div>

          {/* Render Payment Method Select if Abono > 0 */}
          {abono !== '' && abono > 0 && (
            <div>
              <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
                Método de Pago *
              </Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value="" hidden>Selecciona un método</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && <Loader className="animate-spin" size={16} />}
              Guardar Orden
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSimpleOrderModal;
