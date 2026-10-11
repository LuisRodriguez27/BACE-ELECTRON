import React, { useEffect, useState } from 'react';
import { Loader2, WalletCards, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import ClientSearchField from '@/features/orders/components/FormOrderModal/components/ClientSearchField';
import CreateClientModal from '@/features/clients/components/CreateClientModal';
import { useClientSearch } from '@/features/clients/hooks/useClientSearch';
import { useAuthStore } from '@/store/auth';
import { isoToDatetimeLocalMX, nowDatetimeLocalMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import { createCreditSchema, type Credit, type CreditItemForm, type CreditSourceSearchResult } from '../types';
import CreditItemFields from './CreditItemFields';

interface Props {
  isOpen: boolean;
  initialSource?: CreditSourceSearchResult | null;
  onClose: () => void;
  onCreated: (credit: Credit) => void;
}

const emptyItem = (source?: CreditSourceSearchResult | null): CreditItemForm => source ? ({
  source_type: source.source_type,
  source_id: source.id,
  date: isoToDatetimeLocalMX(source.date),
  product: source.product,
  quantity: 1,
  unit_price: source.available,
  total: source.available,
}) : ({
  source_type: 'manual',
  source_id: undefined,
  date: nowDatetimeLocalMX(),
  product: '',
  quantity: 1,
  unit_price: 0,
  total: 0,
});

const CreateCreditModal: React.FC<Props> = ({ isOpen, initialSource, onClose, onCreated }) => {
  const user = useAuthStore(state => state.user);
  const [notes, setNotes] = useState('');
  const [item, setItem] = useState<CreditItemForm>(emptyItem);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [existingCredit, setExistingCredit] = useState<Credit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, setValue, unregister, formState: { errors }, reset: resetForm } = useForm<{ client_id: number }>();
  const clientSearch = useClientSearch({ setValue, unregister });

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setItem(emptyItem(initialSource));
      setError(null);
      setExistingCredit(null);
      resetForm();
      clientSearch.reset();
    }
    // clientSearch is intentionally excluded: its object identity changes per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource, isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen || !clientSearch.selectedClientId) {
      setExistingCredit(null);
      return;
    }
    let cancelled = false;
    setExistingCredit(null);
    setCheckingExisting(true);
    CreditApiService.getOpenByClientId(clientSearch.selectedClientId)
      .then(result => {
        if (!cancelled) setExistingCredit(result);
      })
      .catch(() => {
        if (!cancelled) setExistingCredit(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingExisting(false);
      });
    return () => { cancelled = true; };
  }, [clientSearch.selectedClientId, isOpen]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      setError('No hay un usuario activo');
      return;
    }
    if (!clientSearch.selectedClientId) {
      setError('Selecciona al cliente titular del crédito');
      return;
    }

    const parsed = createCreditSchema.safeParse({
      client_id: clientSearch.selectedClientId,
      notes,
      item,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Revisa los datos del crédito');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const itemPayload = {
        order_id: parsed.data.item.source_type === 'order' ? parsed.data.item.source_id : null,
        simple_order_id: parsed.data.item.source_type === 'simple_order' ? parsed.data.item.source_id : null,
        date: new Date(parsed.data.item.date).toISOString(),
        product: parsed.data.item.product.trim(),
        quantity: parsed.data.item.quantity,
        unit_price: parsed.data.item.unit_price,
        total: parsed.data.item.total,
        created_by: user.id,
      };
      if (existingCredit) {
        setError(`El cliente ya tiene abierto el crédito #${existingCredit.id}. Ábrelo para agregar cargos a esa cuenta.`);
        return;
      }
      const created = await CreditApiService.create({
        client_id: parsed.data.client_id,
        created_by: user.id,
        notes: parsed.data.notes?.trim() || null,
        initial_item: itemPayload,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700"><WalletCards size={20} /></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{initialSource ? 'Agregar orden a crédito' : 'Nuevo crédito'}</h2>
              <p className="text-sm text-gray-500">Selecciona al titular de la deuda; no se toma automáticamente de la orden.</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <ClientSearchField
              clientSearch={clientSearch}
              register={register}
              errors={errors}
              onOpenCreateClientModal={() => setCreateClientOpen(true)}
            />

            {checkingExisting && <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Verificando cuenta abierta...</p>}
            {existingCredit && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
                Este cliente ya tiene el crédito #{existingCredit.id} abierto. No se creará otra cuenta desde aquí; ábrelo para agregar cargos.
              </div>
            )}

            {!existingCredit && <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas de la cuenta</label>
              <textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Autorizaciones o información interna opcional..."
              />
            </div>}

            <div className="border-t pt-5">
              <h3 className="mb-4 font-semibold text-gray-900">Cargo inicial</h3>
              <CreditItemFields value={item} onChange={setItem} sourceLocked={!!initialSource} />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || checkingExisting} className="gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Guardando...' : 'Crear crédito'}
            </Button>
          </div>
        </form>
      </div>

      <CreateClientModal
        isOpen={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onClientCreated={client => {
          clientSearch.handleClientCreated(client);
          setCreateClientOpen(false);
        }}
      />
    </div>
  );
};

export default CreateCreditModal;
