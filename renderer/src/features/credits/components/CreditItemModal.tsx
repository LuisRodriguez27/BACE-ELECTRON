import React, { useEffect, useState } from 'react';
import { Loader2, PackagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { isoToDatetimeLocalMX, nowDatetimeLocalMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import { creditItemFormSchema, type CreditItem, type CreditItemForm } from '../types';
import CreditItemFields from './CreditItemFields';

interface Props {
  creditId: number;
  item?: CreditItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const buildInitial = (item?: CreditItem | null): CreditItemForm => ({
  source_type: item?.source_type || 'manual',
  source_id: item?.order_id || item?.simple_order_id || undefined,
  date: item?.date ? isoToDatetimeLocalMX(item.date) : nowDatetimeLocalMX(),
  product: item?.product || '',
  quantity: item?.quantity || 1,
  unit_price: item?.unit_price || 0,
  total: item?.total || 0,
});

const CreditItemModal: React.FC<Props> = ({ creditId, item, onClose, onSaved }) => {
  const user = useAuthStore(state => state.user);
  const [form, setForm] = useState<CreditItemForm>(() => buildInitial(item));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!item;

  useEffect(() => {
    setForm(buildInitial(item));
    setError(null);
  }, [item]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      setError('No hay un usuario activo');
      return;
    }
    const parsed = creditItemFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Revisa los datos del cargo');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (item) {
        await CreditApiService.updateItem(item.id, {
          date: new Date(parsed.data.date).toISOString(),
          product: parsed.data.product.trim(),
          quantity: parsed.data.quantity,
          unit_price: parsed.data.unit_price,
          total: parsed.data.total,
          edited_by: user.id,
        });
      } else {
        await CreditApiService.addItem({
          credit_id: creditId,
          order_id: parsed.data.source_type === 'order' ? parsed.data.source_id : null,
          simple_order_id: parsed.data.source_type === 'simple_order' ? parsed.data.source_id : null,
          date: new Date(parsed.data.date).toISOString(),
          product: parsed.data.product.trim(),
          quantity: parsed.data.quantity,
          unit_price: parsed.data.unit_price,
          total: parsed.data.total,
          created_by: user.id,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <PackagePlus size={20} className="text-blue-600" />
            {isEditing ? 'Editar cargo' : 'Agregar cargo'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          <CreditItemFields value={form} onChange={setForm} sourceLocked={isEditing} />
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Guardando...' : isEditing ? 'Actualizar cargo' : 'Agregar cargo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditItemModal;

