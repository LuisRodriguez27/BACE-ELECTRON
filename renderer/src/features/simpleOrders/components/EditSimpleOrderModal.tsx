import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, DollarSign, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { SimpleOrdersApiService } from '../SimpleOrdersApiService';
import { useAuth } from '@/hooks/use-auth';
import type { SimpleOrder } from '../types';

interface EditSimpleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
  order: SimpleOrder | null;
}

const EditSimpleOrderModal: React.FC<EditSimpleOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderUpdated,
  order
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [concept, setConcept] = useState('');
  const [client_name, setClientName] = useState('');
  const [total, setTotal] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen && order) {
      setConcept(order.concept || '');
      setClientName(order.client_name || '');
      setTotal(order.total || '');
      setError(null);
    }
  }, [isOpen, order]);

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
    
    if (order && Number(total) < order.totalPaid) {
        setError(`El total no puede ser menor a lo que ya se abonó ($${order.totalPaid})`);
        return;
    }

    setError(null);
    setLoading(true);

    try {
      if (!order) return;
      await SimpleOrdersApiService.update(order.id, {
        user_id: order.user_id, // keep original user
        concept,
        total: Number(total),
        client_name: client_name,
        date: order.date,
        active: order.active
      });

      toast.success('Orden rápida actualizada correctamente');
      onOrderUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Ocurrió un error al actualizar la orden');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative animate-enter">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            Editar Orden Rápida #{order.id}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded text-sm border border-red-100 flex items-start gap-2">
              <X size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="edit-simple-order-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <Label htmlFor="concept" className="mb-1 block font-medium">Concepto principal <span className="text-red-500">*</span></Label>
                <Input
                  id="concept"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Impresiones variadas, engargolado..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="client_name" className="mb-1 block font-medium">Nombre del Cliente <span className="text-gray-400 font-normal text-xs">(Opcional)</span></Label>
                <Input
                  id="client_name"
                  value={client_name}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre de la persona (para tickets / búsquedas)"
                />
              </div>

              <div>
                <Label htmlFor="total" className="mb-1 block font-medium">Total a cobrar <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><DollarSign size={16} /></span>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={total}
                    onChange={(e) => setTotal(e.target.value ? Number(e.target.value) : '')}
                    className="pl-8 text-lg font-semibold"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-lg">
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-simple-order-form" disabled={loading} className="gap-2">
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditSimpleOrderModal;
