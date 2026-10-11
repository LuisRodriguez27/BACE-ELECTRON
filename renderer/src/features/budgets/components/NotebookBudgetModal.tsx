import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Button, Input, Label } from '@/components/ui';
import { todayDateInputMX, isoToDateInputMX, preserveTimeOrStartOfDay } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { useClientSearch } from '@/features/clients/hooks/useClientSearch';
import ClientSearchField from '@/features/orders/components/FormOrderModal/components/ClientSearchField';
import CreateClientModal from '@/features/clients/components/CreateClientModal';
import type { Client } from '@/features/clients/types';
import type { Product } from '@/features/products/types';
import { Loader, Plus, Trash2, X } from 'lucide-react';
import { BudgetApiService } from '../BudgetApiService';
import type { Budget, CreateNotebookBudgetForm, NotebookBudgetItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBudgetCreated: (budget: Budget) => void;
  onBudgetUpdated?: (budget: Budget) => void;
  currentUserId: number;
  budgetToEdit?: Budget | null;
}

const emptyItem = (): NotebookBudgetItem => ({ product_name: '', quantity: 1, unit_price: Number.NaN });

const NotebookBudgetModal: React.FC<Props> = ({ isOpen, onClose, onBudgetCreated, onBudgetUpdated, currentUserId, budgetToEdit }) => {
  const [items, setItems] = useState<NotebookBudgetItem[]>([emptyItem()]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const { register, setValue, unregister, reset, handleSubmit, formState: { errors } } = useForm<any>({
    defaultValues: { user_id: currentUserId, date: todayDateInputMX() },
  });
  const clientSearch = useClientSearch({ setValue, unregister, inputId: 'notebook-client-search-input', dropdownId: 'notebook-client-dropdown' });

  useEffect(() => {
    if (!isOpen) return;
    clientSearch.loadClients();
    if (budgetToEdit) {
      setOriginalDate(budgetToEdit.date);
      reset({ user_id: budgetToEdit.user_id, date: isoToDateInputMX(budgetToEdit.date), client_id: budgetToEdit.client_id });
      clientSearch.setSelectedClientId(budgetToEdit.client_id);
      clientSearch.setClientSearchTerm(budgetToEdit.client ? `${budgetToEdit.client.name} - ${budgetToEdit.client.phone}` : budgetToEdit.client_name || '');
      setItems((budgetToEdit.budgetProducts || []).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) || [emptyItem()]);
    } else {
      setOriginalDate(null);
      reset({ user_id: currentUserId, date: todayDateInputMX() });
      clientSearch.reset();
      setItems([emptyItem()]);
    }
  }, [isOpen, budgetToEdit, currentUserId]);

  const activeTerm = activeRow === null ? '' : items[activeRow]?.product_name || '';
  useEffect(() => {
    if (activeRow === null || !activeTerm.trim()) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const response = await window.api.getProductsPaginated(1, 8, activeTerm);
        setSuggestions(response.data.filter(product => product.active));
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeRow, activeTerm]);

  const updateSuggestionPosition = () => {
    if (activeRow === null) return;
    const input = document.getElementById(`notebook-product-input-${activeRow}`);
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setSuggestionPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useLayoutEffect(() => {
    updateSuggestionPosition();
  }, [activeRow, items.length]);

  useEffect(() => {
    if (activeRow === null) return;
    const reposition = () => updateSuggestionPosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [activeRow]);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0), [items]);
  const updateItem = (index: number, patch: Partial<NotebookBudgetItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const chooseProduct = (index: number, product: Product) => {
    updateItem(index, { product_id: product.id, product_name: product.name, suggested_price: product.price });
    setActiveRow(null);
  };
  const addItem = () => setItems(current => [...current, emptyItem()]);
  const removeItem = (index: number) => setItems(current => current.length === 1 ? [emptyItem()] : current.filter((_, i) => i !== index));

  const close = () => { setError(null); setActiveRow(null); setSuggestions([]); setSuggestionPosition(null); onClose(); };
  const submit = async (data: any) => {
    const freeClientName = clientSearch.selectedClientId ? undefined : clientSearch.clientSearchTerm.trim();
    if (!clientSearch.selectedClientId && !freeClientName) { setError('Selecciona un cliente o escribe su nombre'); return; }
    if (items.some(item => !item.product_name.trim())) { setError('Todos los renglones necesitan un producto'); return; }
    if (items.some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) { setError('Todas las cantidades deben ser mayores a cero'); return; }
    if (items.some(item => !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0)) { setError('Escribe un precio unitario válido en todos los renglones'); return; }
    try {
      setSubmitting(true); setError(null);
      const payload: CreateNotebookBudgetForm = {
        user_id: currentUserId,
        date: preserveTimeOrStartOfDay(data.date, originalDate),
        client_id: clientSearch.selectedClientId,
        client_name: freeClientName,
        budget_type: 'notebook',
        items,
      };
      if (budgetToEdit) {
        const updated = await BudgetApiService.update(budgetToEdit.id, { ...payload, edited_by: currentUserId } as any);
        onBudgetUpdated?.(updated);
      } else {
        const created = await BudgetApiService.create(payload as any);
        onBudgetCreated(created);
      }
      close();
    } catch (err) { setError(extractErrorMessage(err)); }
    finally { setSubmitting(false); }
  };
  if (!isOpen) return null;
  return <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
  >
    <form onSubmit={handleSubmit(submit)} className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b"><div><h2 className="text-lg font-semibold">{budgetToEdit ? `Editar Presupuesto #${budgetToEdit.id}` : 'Nuevo Presupuesto — Bloc de notas'}</h2><p className="text-sm text-gray-500">Escribe libremente; el catálogo sólo sugiere productos y precios.</p></div><Button type="button" variant="ghost" size="sm" onClick={close}><X size={16}/></Button></div>
      <div className="overflow-y-auto p-6 space-y-6">
        {error && <div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><ClientSearchField clientSearch={clientSearch} register={register} errors={errors} onOpenCreateClientModal={() => setShowCreateClient(true)} required={false} allowFreeText /><div><Label>Fecha *</Label><Input type="date" className="mt-1" {...register('date', { required: true })}/></div><div className="self-end rounded bg-green-50 border border-green-100 p-2 text-right"><span className="text-xs text-gray-500">Total</span><p className="font-bold text-green-700 text-xl">${total.toFixed(2)}</p></div></div>
        <div className="border rounded-lg overflow-visible"><div className="grid grid-cols-[90px_minmax(220px,1fr)_140px_140px_44px] gap-3 items-center bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600"><span>Cantidad</span><span>Producto</span><span>Precio Unitario</span><span>Precio Total</span><span/></div>
          {items.map((item, index) => <div key={index} className="grid grid-cols-[90px_minmax(220px,1fr)_140px_140px_44px] gap-3 items-start p-3 border-t relative">
            <Input type="number" min="0.0001" step="0.0001" value={Number.isNaN(item.quantity) ? '' : item.quantity} onChange={e => updateItem(index, { quantity: e.target.value === '' ? NaN : Number(e.target.value) })}/>
            <div className="relative"><Input id={`notebook-product-input-${index}`} value={item.product_name} placeholder="Escribe un producto" onFocus={() => setActiveRow(index)} onChange={e => { updateItem(index, { product_name: e.target.value, product_id: null }); setActiveRow(index); }}/>{activeRow === index && suggestions.length > 0 && suggestionPosition && createPortal(<div className="fixed z-[9999] max-h-52 overflow-y-auto rounded border bg-white shadow-lg" style={{ top: suggestionPosition.top, left: suggestionPosition.left, width: suggestionPosition.width }}>{suggestions.map(product => <button type="button" key={product.id} onMouseDown={e => e.preventDefault()} onClick={() => chooseProduct(index, product)} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex justify-between gap-3"><span>{product.name}</span><span className="text-gray-500">${product.price.toFixed(2)}</span></button>)}</div>, document.body)}</div>
            <Input type="number" min="0" step="0.01" value={Number.isNaN(item.unit_price) ? '' : item.unit_price} placeholder={item.product_id ? `$${item.suggested_price?.toFixed(2) ?? '—'}` : 'Escribe el precio'} className={Number.isNaN(item.unit_price) ? 'bg-gray-100 placeholder:text-gray-400' : ''} onChange={e => updateItem(index, { unit_price: e.target.value === '' ? NaN : Number(e.target.value) })}/>
            <div className="h-10 flex items-center justify-end font-medium">${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)}</div><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600"><Trash2 size={16}/></Button>
          </div>)}</div>
        <Button type="button" variant="outline" onClick={addItem} className="gap-2"><Plus size={16}/>Agregar renglón</Button>
      </div>
      <div className="flex justify-end gap-3 p-6 border-t"><Button type="button" variant="outline" onClick={close}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting && <Loader className="animate-spin mr-2" size={16}/>} {budgetToEdit ? 'Guardar cambios' : 'Crear presupuesto'}</Button></div>
    </form>
    <CreateClientModal isOpen={showCreateClient} onClose={() => setShowCreateClient(false)} onClientCreated={(client: Client) => clientSearch.handleClientCreated(client)} />
  </div>;
};

export default NotebookBudgetModal;
