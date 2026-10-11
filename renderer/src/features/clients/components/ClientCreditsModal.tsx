import React, { useEffect, useState } from 'react';
import { Calendar, CircleDollarSign, Loader2, Printer, WalletCards, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditApiService } from '@/features/credits/CreditApiService';
import { generateCreditsLogbookHtml } from '@/features/credits/logbook';
import type { Credit } from '@/features/credits/types';
import { formatDateMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { toast } from 'sonner';
import type { Client } from '../types';

interface ClientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const CreditList: React.FC<{ credits: Credit[]; emptyMessage: string }> = ({ credits, emptyMessage }) => {
  if (credits.length === 0) return <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">{emptyMessage}</p>;

  return (
    <div className="space-y-3">
      {credits.map(credit => (
        <div key={credit.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">Crédito #{credit.id}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Calendar size={13} /> Apertura: {formatDateMX(credit.opened_at, 'DD/MM/YYYY HH:mm')}</p>
              {credit.closing_date && <p className="mt-1 text-xs text-gray-500">Cierre: {formatDateMX(credit.closing_date, 'DD/MM/YYYY HH:mm')}</p>}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${credit.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
              {credit.status === 'open' ? 'Pendiente' : 'Completado'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <p className="rounded bg-blue-50 px-3 py-2 text-blue-800"><span className="block text-xs text-blue-600">Cargos</span>{money(credit.total_charges)}</p>
            <p className="rounded bg-green-50 px-3 py-2 text-green-800"><span className="block text-xs text-green-600">Abonado</span>{money(credit.total_paid)}</p>
            <p className={`rounded px-3 py-2 ${credit.balance > 0.01 ? 'bg-orange-50 text-orange-800' : 'bg-green-50 text-green-800'}`}><span className="block text-xs opacity-80">Saldo</span>{money(credit.balance)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ClientCreditsModal: React.FC<ClientCreditsModalProps> = ({ isOpen, onClose, client }) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = async (clientId: number) => {
    try {
      setLoading(true);
      setError(null);
      setCredits(await CreditApiService.getByClientId(clientId));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && client?.id) void loadCredits(client.id);
    else {
      setCredits([]);
      setError(null);
    }
  }, [isOpen, client?.id]);

  if (!isOpen || !client) return null;

  const pendingCredits = credits.filter(credit => credit.status === 'open');
  const completedCredits = credits.filter(credit => credit.status === 'closed');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }
    printWindow.document.write(generateCreditsLogbookHtml(
      credits,
      { status: 'all' },
      formatDateMX(new Date(), 'DD/MM/YYYY HH:mm')
    ));
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2"><WalletCards className="text-purple-600" size={20} /></div>
            <div><h2 className="text-xl font-semibold text-gray-900">Créditos de {client.name}</h2><p className="text-sm text-gray-500">Cuentas pendientes y completadas del cliente</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || !!error || credits.length === 0} className="gap-2"><Printer size={15} /> Imprimir créditos</Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2" aria-label="Cerrar créditos"><X size={20} /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-gray-500"><Loader2 className="animate-spin" size={22} /> Cargando créditos...</div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800"><p>{error}</p><Button size="sm" className="mt-3" onClick={() => loadCredits(client.id)}>Reintentar</Button></div>
          ) : credits.length === 0 ? (
            <div className="py-14 text-center"><WalletCards className="mx-auto mb-3 text-gray-300" size={44} /><h3 className="font-medium text-gray-900">Sin créditos registrados</h3><p className="mt-1 text-sm text-gray-500">{client.name} aún no tiene cuentas de crédito.</p></div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-purple-900">Resumen</p><p className="text-sm text-purple-700">{credits.length} crédito{credits.length === 1 ? '' : 's'} registrado{credits.length === 1 ? '' : 's'}</p></div><p className="flex items-center gap-1 text-xl font-bold text-purple-900"><CircleDollarSign size={19} /> {money(pendingCredits.reduce((total, credit) => total + credit.balance, 0))}</p></div><p className="mt-1 text-right text-xs text-purple-700">Saldo pendiente</p></div>
              <section><h3 className="mb-3 font-semibold text-gray-900">Pendientes ({pendingCredits.length})</h3><CreditList credits={pendingCredits} emptyMessage="No hay créditos pendientes." /></section>
              <section><h3 className="mb-3 font-semibold text-gray-900">Completados ({completedCredits.length})</h3><CreditList credits={completedCredits} emptyMessage="No hay créditos completados." /></section>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 p-4"><Button variant="outline" onClick={onClose}>Cerrar</Button></div>
      </div>
    </div>
  );
};

export default ClientCreditsModal;
