import React, { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import ClientSearchField from '@/features/orders/components/FormOrderModal/components/ClientSearchField';
import CreateClientModal from '@/features/clients/components/CreateClientModal';
import { useClientSearch } from '@/features/clients/hooks/useClientSearch';
import { useAuthStore } from '@/store/auth';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import type { Credit, CreditAssignmentSource } from '../types';

interface Props {
  source: CreditAssignmentSource;
  onClose: () => void;
  onAssigned: (credit: Credit) => void;
}

type AssignmentMode = 'existing' | 'create';

const currency = (amount: number) => `$${amount.toFixed(2)}`;

const AssignOrderToCreditModal: React.FC<Props> = ({ source, onClose, onAssigned }) => {
  const user = useAuthStore(state => state.user);
  const [mode, setMode] = useState<AssignmentMode>('existing');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [selectedCreditId, setSelectedCreditId] = useState<number | null>(null);
  const [recommendedCredit, setRecommendedCredit] = useState<Credit | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [product, setProduct] = useState(source.product);
  const [error, setError] = useState<string | null>(null);
  const { register, setValue, unregister, formState: { errors }, reset } = useForm<{ client_id: number }>();
  const clientSearch = useClientSearch({ setValue, unregister, dropdownId: 'credit-assignment-client-dropdown', inputId: 'credit-assignment-client-input' });

  const linkedItem = useMemo(() => ({
    order_id: source.source_type === 'order' ? source.id : null,
    simple_order_id: source.source_type === 'simple_order' ? source.id : null,
    date: source.date,
    product: product.trim(),
    quantity: 1,
    unit_price: source.available,
    total: source.available,
    created_by: user?.id || 0,
  }), [product, source, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCredits(true);
      try {
        const [result, ownCredit] = await Promise.all([
          CreditApiService.getAll(1, 100, { status: 'open' }),
          source.client_id ? CreditApiService.getOpenByClientId(source.client_id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCredits(result.data);
        setRecommendedCredit(ownCredit);
        if (ownCredit) setSelectedCreditId(ownCredit.id);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoadingCredits(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [source.client_id]);

  const assignToExisting = async () => {
    if (!selectedCreditId) {
      setError('Selecciona un crédito abierto');
      return;
    }
    if (!linkedItem.product) {
      setError('El producto o concepto es obligatorio');
      return;
    }
    await CreditApiService.addItem({ credit_id: selectedCreditId, ...linkedItem });
    onAssigned(await CreditApiService.getById(selectedCreditId));
  };

  const createCredit = async () => {
    const clientId = source.client_id || clientSearch.selectedClientId;
    if (!clientId) {
      setError('Selecciona al cliente titular del crédito');
      return;
    }
    if (!linkedItem.product) {
      setError('El producto o concepto es obligatorio');
      return;
    }
    if (recommendedCredit && source.client_id === clientId) {
      setMode('existing');
      setSelectedCreditId(recommendedCredit.id);
      setError(`El cliente de la orden ya tiene abierto el crédito #${recommendedCredit.id}. Selecciónalo para agregar el cargo.`);
      return;
    }
    onAssigned(await CreditApiService.create({ client_id: clientId, created_by: user!.id, initial_item: linkedItem }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('No hay un usuario activo');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'existing') await assignToExisting();
      else await createCredit();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 text-purple-700"><CreditCard size={20} /></div>
            <div><h2 className="text-lg font-semibold text-gray-900">Agregar a crédito</h2><p className="text-sm text-gray-500">La orden se carga completa; el titular puede ser distinto al cliente de la orden.</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="font-medium text-gray-900">{source.source_type === 'order' ? 'Orden' : 'Orden rápida'} #{source.id}</span><span className="font-semibold text-purple-700">{currency(source.available)}</span></div>
            <p className="mt-1 text-gray-600">{source.client_name || 'Sin nombre'}{source.client_phone ? ` · ${source.client_phone}` : ''}</p>
            <p className="mt-1 text-xs text-gray-500">El importe pendiente se transfiere completo y no se puede modificar desde este atajo.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => { setMode('existing'); setError(null); }} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'existing' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600'}`}>Crédito existente</button>
            <button type="button" onClick={() => { setMode('create'); setError(null); }} className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'create' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600'}`}>Nuevo crédito</button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Selecciona la cuenta que asumirá la deuda</p>
              {loadingCredits ? <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" /> Cargando créditos...</p> : credits.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-gray-500">No hay créditos abiertos. Crea uno nuevo.</p> : credits.map(credit => (
                <button key={credit.id} type="button" onClick={() => setSelectedCreditId(credit.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedCreditId === credit.id ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-300' : 'border-gray-200 hover:border-purple-300'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">Crédito #{credit.id} · {credit.client_name || 'Sin nombre'}</span>{selectedCreditId === credit.id && <Check size={17} className="text-purple-700" />}</div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500"><span>{credit.client_phone || 'Sin teléfono'}{recommendedCredit?.id === credit.id ? ' · Cliente de esta orden' : ''}</span><span>Saldo: {currency(credit.balance)}</span></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {source.client_id ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">El nuevo crédito quedará a nombre de <strong>{source.client_name || `cliente #${source.client_id}`}</strong>, el cliente de esta orden normal.</div> : <><p className="text-sm text-gray-600">Una orden rápida solo guarda nombre/teléfono como referencia. Selecciona o crea el cliente real que será titular.</p><ClientSearchField clientSearch={clientSearch} register={register} errors={errors} onOpenCreateClientModal={() => setCreateClientOpen(true)} /></>}
              {recommendedCredit && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Este cliente ya tiene el crédito #{recommendedCredit.id} abierto. No puede tener una segunda cuenta abierta; usa la opción “Crédito existente”.</p>}
            </div>
          )}

          <div><label className="mb-1 block text-sm font-medium text-gray-700">Producto o concepto *</label><input value={product} onChange={event => setProduct(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" /></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button><Button type="button" onClick={handleSubmit} disabled={submitting || loadingCredits || (mode === 'existing' && !selectedCreditId)} className="gap-2">{submitting && <Loader2 size={16} className="animate-spin" />}{mode === 'existing' ? 'Agregar cargo' : 'Crear crédito'}</Button></div>
      </div>
      <CreateClientModal isOpen={createClientOpen} onClose={() => setCreateClientOpen(false)} onClientCreated={client => { clientSearch.handleClientCreated(client); setCreateClientOpen(false); reset({ client_id: client.id }); }} />
    </div>
  );
};

export default AssignOrderToCreditModal;
