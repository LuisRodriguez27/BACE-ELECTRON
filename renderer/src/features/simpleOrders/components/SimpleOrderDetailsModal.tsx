import React, { useEffect, useState } from 'react';
import { Calendar, CircleDollarSign, FileText, Loader2, Phone, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateMX } from '@/utils/dateUtils';
import { SimpleOrdersApiService } from '../SimpleOrdersApiService';
import type { SimpleOrder } from '../types';

interface SimpleOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
}

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const SimpleOrderDetailsModal: React.FC<SimpleOrderDetailsModalProps> = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder] = useState<SimpleOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);
      setOrder(await SimpleOrdersApiService.getById(orderId));
    } catch (err) {
      console.error('Error loading simple order details:', err);
      setError('No se pudieron cargar los detalles de la orden rápida.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      void loadOrder();
    } else {
      setOrder(null);
      setError(null);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900"><FileText size={21} className="text-blue-600" /> Orden rápida #{orderId}</h2>
            <p className="mt-1 text-sm text-gray-500">Detalle de la orden relacionada con el crédito</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Cerrar detalles de la orden rápida"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              <p>{error}</p>
              <Button size="sm" className="mt-3" onClick={loadOrder}>Reintentar</Button>
            </div>
          ) : order ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs uppercase text-gray-500">Total</p><p className="mt-1 text-xl font-bold text-blue-700">{money(order.total)}</p></div>
                <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs uppercase text-gray-500">Pagado</p><p className="mt-1 text-xl font-bold text-green-700">{money(order.totalPaid)}</p></div>
                <div className="rounded-lg border border-gray-200 p-4"><p className="text-xs uppercase text-gray-500">Saldo</p><p className={`mt-1 text-xl font-bold ${order.balance > 0.01 ? 'text-orange-700' : 'text-green-700'}`}>{money(order.balance)}</p></div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-1 text-xs uppercase text-gray-500">Concepto</p>
                <p className="whitespace-pre-wrap font-medium text-gray-900">{order.concept}</p>
                <p className="mt-3 flex items-center gap-1 text-sm text-gray-500"><Calendar size={14} /> {formatDateMX(order.date, 'DD/MM/YYYY HH:mm')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-1 flex items-center gap-1 text-xs uppercase text-gray-500"><User size={13} /> Cliente</p><p className="font-medium text-gray-900">{order.client_name || 'Sin cliente asignado'}</p>{order.client_phone && <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><Phone size={13} /> {order.client_phone}</p>}</div>
                <div className="rounded-lg border border-gray-200 p-4"><p className="mb-1 flex items-center gap-1 text-xs uppercase text-gray-500"><CircleDollarSign size={13} /> Pagos registrados</p><p className="text-xl font-bold text-gray-900">{order.payments.length}</p>{(order.credited_amount || 0) > 0 && <p className="mt-1 text-sm text-purple-700">{money(order.credited_amount || 0)} enviado a crédito</p>}</div>
              </div>

              <section className="overflow-hidden rounded-lg border border-gray-200">
                <div className="border-b bg-gray-50 px-4 py-3 font-semibold text-gray-900">Historial de pagos</div>
                {order.payments.length === 0 ? <p className="px-4 py-6 text-center text-sm text-gray-400">No hay pagos registrados.</p> : (
                  <div className="divide-y divide-gray-100">{order.payments.map(payment => <div key={`${payment.is_credit ? 'credit' : 'payment'}-${payment.id}`} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-sm font-medium text-gray-800">{payment.descripcion || (payment.is_credit ? 'Abono a crédito' : 'Pago')}</p><p className="text-xs text-gray-500">{formatDateMX(payment.date, 'DD/MM/YYYY HH:mm')}</p></div><p className="font-semibold text-green-700">{money(payment.amount)}</p></div>)}</div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SimpleOrderDetailsModal;
