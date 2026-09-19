import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CircleDollarSign,
  Edit3,
  FileText,
  History,
  Loader2,
  Lock,
  LockOpen,
  PackagePlus,
  Phone,
  Receipt,
  Trash2,
  User,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDateMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import type { Credit, CreditItem } from '../types';
import AddCreditPaymentModal from './AddCreditPaymentModal';
import CreditItemModal from './CreditItemModal';
import CreditStatementModal from './CreditStatementModal';

interface Props {
  creditId: number;
  canManage: boolean;
  onClose: () => void;
  onChanged: (credit: Credit) => void;
}

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const CreditDetailModal: React.FC<Props> = ({ creditId, canManage, onClose, onChanged }) => {
  const [credit, setCredit] = useState<Credit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CreditItem | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [removeItem, setRemoveItem] = useState<CreditItem | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<'close' | 'reopen' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCredit = useCallback(async () => {
    setError(null);
    try {
      const result = await CreditApiService.getById(creditId);
      setCredit(result);
      setNotes(result.notes || '');
      onChanged(result);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [creditId, onChanged]);

  useEffect(() => {
    setLoading(true);
    loadCredit();
  }, [loadCredit]);

  const saveNotes = async () => {
    if (!credit) return;
    setSavingNotes(true);
    try {
      const updated = await CreditApiService.updateNotes(credit.id, notes.trim() || null);
      setCredit(updated);
      onChanged(updated);
      toast.success('Notas actualizadas');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRemoveItem = async () => {
    if (!removeItem) return;
    setActionLoading(true);
    try {
      await CreditApiService.removeItem(removeItem.id);
      setRemoveItem(null);
      await loadCredit();
      toast.success('Cargo eliminado');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!credit || !statusConfirm) return;
    setActionLoading(true);
    try {
      const updated = statusConfirm === 'close'
        ? await CreditApiService.close(credit.id, notes.trim() || null)
        : await CreditApiService.reopen(credit.id);
      setCredit(updated);
      setNotes(updated.notes || '');
      onChanged(updated);
      setStatusConfirm(null);
      toast.success(statusConfirm === 'close' ? 'Crédito cerrado' : 'Crédito reabierto');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <WalletCards size={22} className="text-blue-600" /> Crédito #{creditId}
            </h2>
            {credit && <p className="mt-1 text-sm text-gray-500">{credit.client_name} · {credit.client_phone}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
          ) : error || !credit ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              <p>{error || 'No se pudo cargar el crédito'}</p>
              <Button size="sm" className="mt-3" onClick={loadCredit}>Reintentar</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-3 py-1 font-medium ${credit.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {credit.status === 'open' ? 'Abierto' : 'Cerrado'}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500"><Calendar size={14} /> Abierto {formatDateMX(credit.opened_at, 'DD/MM/YYYY HH:mm')}</span>
                  {credit.closing_date && <span className="text-gray-500">· Cerrado {formatDateMX(credit.closing_date, 'DD/MM/YYYY HH:mm')}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setStatementOpen(true)} className="gap-2"><FileText size={15} /> Corte</Button>
                  {canManage && credit.status === 'open' && (
                    <>
                      <Button variant="outline" onClick={() => { setEditingItem(null); setItemModalOpen(true); }} className="gap-2"><PackagePlus size={15} /> Agregar cargo</Button>
                      <Button onClick={() => setPaymentModalOpen(true)} disabled={credit.balance <= 0.01} className="gap-2 bg-green-600 hover:bg-green-700"><CircleDollarSign size={15} /> Abonar</Button>
                      <Button variant="outline" onClick={() => setStatusConfirm('close')} disabled={Math.abs(credit.balance) > 0.01} className="gap-2"><Lock size={15} /> Cerrar crédito</Button>
                    </>
                  )}
                  {canManage && credit.status === 'closed' && (
                    <Button variant="outline" onClick={() => setStatusConfirm('reopen')} className="gap-2"><LockOpen size={15} /> Reabrir</Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase text-gray-500">Total de cargos</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">{money(credit.total_charges)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase text-gray-500">Total abonado</p>
                  <p className="mt-1 text-2xl font-bold text-green-700">{money(credit.total_paid)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase text-gray-500">Saldo pendiente</p>
                  <p className={`mt-1 text-2xl font-bold ${credit.balance > 0.01 ? 'text-orange-700' : 'text-green-700'}`}>{money(credit.balance)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs uppercase text-gray-500">Movimientos</p>
                  <p className="mt-1 text-2xl font-bold text-gray-800">{credit.items.length + credit.payments.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><User size={17} className="text-blue-600" /> Titular del crédito</h3>
                  <p className="font-medium text-gray-900">{credit.client_name || 'Sin nombre'}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-600"><Phone size={13} /> {credit.client_phone || 'Sin teléfono'}</p>
                  <p className="mt-1 text-xs text-gray-500">Cliente #{credit.client_id}</p>
                </div>
                <div className="lg:col-span-2 rounded-lg border border-gray-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notas internas</h3>
                    {canManage && <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>{savingNotes ? 'Guardando...' : 'Guardar notas'}</Button>}
                  </div>
                  <textarea
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                    disabled={!canManage}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="Sin notas..."
                  />
                </div>
              </div>

              <section className="overflow-hidden rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Receipt size={17} /> Cargos ({credit.items.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs uppercase text-gray-500">
                      <tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-left">Origen</th><th className="px-4 py-3 text-right">Cantidad</th><th className="px-4 py-3 text-right">Total</th>{canManage && credit.status === 'open' && <th className="px-4 py-3 text-center">Acciones</th>}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {credit.items.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin cargos activos.</td></tr>
                      ) : credit.items.map(item => {
                        const sourceId = item.order_id || item.simple_order_id;
                        const differentSourceClient = item.source_client_name && item.source_client_name !== credit.client_name;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateMX(item.date, 'DD/MM/YYYY HH:mm')}</td>
                            <td className="max-w-sm px-4 py-3">
                              <p className="font-medium text-gray-900">{item.product}</p>
                              <p className="text-xs text-gray-500">{money(item.unit_price)} c/u</p>
                            </td>
                            <td className="px-4 py-3">
                              {item.source_type === 'manual' ? (
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Manual</span>
                              ) : (
                                <div>
                                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                    {item.source_type === 'order' ? 'Orden' : 'Rápida'} #{sourceId}
                                  </span>
                                  {item.source_client_name && <p className={`mt-1 text-xs ${differentSourceClient ? 'font-medium text-amber-700' : 'text-gray-500'}`}>Pedido por: {item.source_client_name}</p>}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-700">{money(item.total)}</td>
                            {canManage && credit.status === 'open' && (
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-1">
                                  <button type="button" onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Editar cargo"><Edit3 size={15} /></button>
                                  <button type="button" onClick={() => setRemoveItem(item)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Eliminar cargo"><Trash2 size={15} /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-lg border border-gray-200">
                <div className="border-b bg-gray-50 px-4 py-3"><h3 className="flex items-center gap-2 font-semibold text-gray-900"><History size={17} /> Abonos ({credit.payments.length})</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Método</th><th className="px-4 py-3 text-left">Información</th><th className="px-4 py-3 text-left">Caja</th><th className="px-4 py-3 text-right">Monto</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {credit.payments.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aún no hay abonos.</td></tr>
                      ) : credit.payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDateMX(payment.date, 'DD/MM/YYYY HH:mm')}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{payment.descripcion || 'Sin método'}</td>
                          <td className="px-4 py-3 text-gray-600">{payment.info || `Abono #${payment.id}`}</td>
                          <td className="px-4 py-3 text-gray-500">{payment.cash_session_id ? `#${payment.cash_session_id}` : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">{money(payment.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {credit && itemModalOpen && (
        <CreditItemModal
          creditId={credit.id}
          item={editingItem}
          onClose={() => { setItemModalOpen(false); setEditingItem(null); }}
          onSaved={loadCredit}
        />
      )}
      {credit && paymentModalOpen && (
        <AddCreditPaymentModal
          creditId={credit.id}
          balance={credit.balance}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={loadCredit}
        />
      )}
      {credit && statementOpen && <CreditStatementModal credit={credit} onClose={() => setStatementOpen(false)} />}

      <ConfirmDialog
        isOpen={!!removeItem}
        onClose={() => setRemoveItem(null)}
        onConfirm={handleRemoveItem}
        title="Eliminar cargo"
        message="El cargo dejará de formar parte del saldo. No se permitirá si los abonos quedarían por encima del total de cargos."
        confirmText="Eliminar"
        type="danger"
        isLoading={actionLoading}
      />
      <ConfirmDialog
        isOpen={!!statusConfirm}
        onClose={() => setStatusConfirm(null)}
        onConfirm={handleStatusChange}
        title={statusConfirm === 'close' ? 'Cerrar crédito' : 'Reabrir crédito'}
        message={statusConfirm === 'close'
          ? 'El crédito quedará bloqueado para nuevos cargos y abonos. Sólo se puede cerrar con saldo cero.'
          : 'El crédito volverá a aceptar cargos y abonos, siempre que el cliente no tenga otra cuenta abierta.'}
        confirmText={statusConfirm === 'close' ? 'Cerrar crédito' : 'Reabrir'}
        type={statusConfirm === 'close' ? 'warning' : 'info'}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default CreditDetailModal;

