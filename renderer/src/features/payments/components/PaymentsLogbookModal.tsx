import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer, BookOpen, AlertCircle, CalendarDays, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateMX } from '@/utils/dateUtils';
import type { Payment } from '../types';
import type { Order } from '../../orders/types';
import {
  generatePaymentsReceivedLogbook,
  generatePendingPaymentsLogbook,
  type PaymentLogbookFilters,
  type OrderWithBalance,
} from '../logbook';

interface PaymentsLogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
  orders: Order[];
}

type LogbookType = 'received' | 'pending';
type DateMode = 'single' | 'range' | 'all';

// ─── Helpers de fecha ──────────────────────────────────────────────────────
const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = () => toLocalISODate(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return toLocalISODate(d); };
const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return toLocalISODate(d); };
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

const PaymentsLogbookModal: React.FC<PaymentsLogbookModalProps> = ({
  isOpen,
  onClose,
  payments,
  orders,
}) => {
  const [logbookType, setLogbookType] = useState<LogbookType>('received');
  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setLogbookType('received');
      setDateMode('single');
      setSingleDate(today());
      setDateFrom('');
      setDateTo('');
    }
  }, [isOpen]);

  // ─── Construir filtros según el modo ──────────────────────────────────
  const filters: PaymentLogbookFilters = useMemo(() => {
    if (dateMode === 'all') return {};
    if (dateMode === 'single') return { dateFrom: singleDate, dateTo: singleDate };
    return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  }, [dateMode, singleDate, dateFrom, dateTo]);

  // ─── Pagos filtrados ──────────────────────────────────────────────────
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!p.date) return true;
      const d = new Date(p.date);
      if (filters.dateFrom) { if (d < new Date(filters.dateFrom + 'T00:00:00')) return false; }
      if (filters.dateTo)   { if (d > new Date(filters.dateTo   + 'T23:59:59')) return false; }
      return true;
    });
  }, [payments, filters]);

  // ─── Órdenes con saldo ────────────────────────────────────────────────
  const ordersWithBalance: OrderWithBalance[] = useMemo(() => {
    return orders
      .map(o => {
        const paid = payments
          .filter(p => p.order_id === o.id)
          .reduce((acc, p) => acc + p.amount, 0);
        return { ...o, totalPaid: paid, balance: o.total - paid };
      })
      .filter(o => o.balance > 0.009);
  }, [orders, payments]);

  const filteredPendingOrders = useMemo(() => {
    return ordersWithBalance.filter(o => {
      if (!o.date) return true;
      const d = new Date(o.date);
      if (filters.dateFrom) { if (d < new Date(filters.dateFrom + 'T00:00:00')) return false; }
      if (filters.dateTo)   { if (d > new Date(filters.dateTo   + 'T23:59:59')) return false; }
      return true;
    });
  }, [ordersWithBalance, filters]);

  const previewCount = logbookType === 'received' ? filteredPayments.length : filteredPendingOrders.length;
  const previewTotal = logbookType === 'received'
    ? filteredPayments.reduce((acc, p) => acc + p.amount, 0)
    : filteredPendingOrders.reduce((acc, o) => acc + o.balance, 0);

  // ─── Atajos de fecha ──────────────────────────────────────────────────
  const applyShortcut = (from: string, to: string, mode: DateMode = 'range') => {
    if (mode === 'single') {
      setDateMode('single');
      setSingleDate(from);
    } else {
      setDateMode('range');
      setDateFrom(from);
      setDateTo(to);
    }
  };

  // ─── Imprimir ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    const currentDate = formatDateMX(new Date().toISOString(), 'D [de] MMMM YYYY, HH:mm');
    const html = logbookType === 'received'
      ? generatePaymentsReceivedLogbook(filteredPayments, filters, currentDate)
      : generatePendingPaymentsLogbook(filteredPendingOrders, filters, currentDate);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Bitácora enviada a impresión');
  };

  if (!isOpen) return null;

  const totalFmt = previewTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 });

  // Clase para botones de atajo activo
  const isShortcutActive = (from: string, to: string) =>
    dateMode === 'range' && dateFrom === from && dateTo === to;
  const isSingleActive = (d: string) =>
    dateMode === 'single' && singleDate === d;

  const shortcutBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Imprimir Bitácora</h2>
              <p className="text-xs text-gray-500">Elige el tipo de reporte y el período</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">

          {/* Tipo de bitácora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de bitácora</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLogbookType('received')}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm transition-all ${
                  logbookType === 'received'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Printer size={17} />
                <span className="font-medium">Pagos Recibidos</span>
                <span className="text-xs text-center opacity-70 leading-tight">
                  Lista de pagos ingresados
                </span>
              </button>
              <button
                onClick={() => setLogbookType('pending')}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm transition-all ${
                  logbookType === 'pending'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <AlertCircle size={17} />
                <span className="font-medium">Pagos Pendientes</span>
                <span className="text-xs text-center opacity-70 leading-tight">
                  Órdenes con saldo por cobrar
                </span>
              </button>
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período{' '}
              <span className="text-gray-400 font-normal text-xs">
                ({logbookType === 'received' ? 'fecha del pago' : 'fecha de la orden'})
              </span>
            </label>

            {/* Atajos rápidos */}
            <div className="flex flex-wrap gap-2 mb-3">
              {shortcutBtn('Hoy',       isSingleActive(today()),     () => applyShortcut(today(), today(), 'single'))}
              {shortcutBtn('Ayer',       isSingleActive(yesterday()), () => applyShortcut(yesterday(), yesterday(), 'single'))}
              {shortcutBtn('Esta semana', isShortcutActive(weekStart(), today()),  () => applyShortcut(weekStart(), today()))}
              {shortcutBtn('Este mes',   isShortcutActive(monthStart(), today()),  () => applyShortcut(monthStart(), today()))}
              {shortcutBtn('Todo',       dateMode === 'all',                        () => setDateMode('all'))}
            </div>

            {/* Selector de modo */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-3">
              <button
                onClick={() => { setDateMode('single'); setSingleDate(today()); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  dateMode === 'single'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CalendarDays size={13} />
                Un día
              </button>
              <button
                onClick={() => { setDateMode('range'); setDateFrom(''); setDateTo(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-l border-gray-300 transition-colors ${
                  dateMode === 'range'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar size={13} />
                Rango de fechas
              </button>
              <button
                onClick={() => setDateMode('all')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-l border-gray-300 transition-colors ${
                  dateMode === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Inputs de fecha */}
            {dateMode === 'single' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={e => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}

            {dateMode === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {dateMode === 'all' && (
              <p className="text-xs text-gray-400 text-center py-1">
                Se incluirán todos los registros sin filtro de fecha
              </p>
            )}
          </div>

          {/* Previsualización */}
          <div className={`rounded-lg p-4 border ${
            logbookType === 'received'
              ? 'bg-indigo-50 border-indigo-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">
                  {logbookType === 'received' ? 'Pagos a imprimir' : 'Órdenes a imprimir'}
                </p>
                <p className={`text-2xl font-bold ${
                  logbookType === 'received' ? 'text-indigo-700' : 'text-orange-700'
                }`}>
                  {previewCount} {logbookType === 'received' ? 'pago(s)' : 'orden(es)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">
                  {logbookType === 'received' ? 'Total recibido' : 'Total pendiente'}
                </p>
                <p className={`text-xl font-bold ${
                  logbookType === 'received' ? 'text-indigo-700' : 'text-orange-700'
                }`}>
                  ${totalFmt}
                </p>
              </div>
            </div>
            {previewCount === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                No hay registros para el período seleccionado.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handlePrint}
            disabled={previewCount === 0}
            className={`flex items-center gap-2 ${
              logbookType === 'pending'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Printer size={15} />
            Imprimir Bitácora
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentsLogbookModal;
