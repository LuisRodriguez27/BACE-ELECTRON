import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDateMX } from '@/utils/dateUtils';
import { CashSessionApiService } from '../CashSessionApiService';
import type { CashSession, CashSessionSummary } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d: string | null) =>
  d ? formatDateMX(d, 'DD MMM YYYY, h:mm A') : '—';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sessionId: number;
  onClose: () => void;
}

// ── Accordion section ─────────────────────────────────────────────────────────

const Section: React.FC<{
  title: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, count, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-3">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className="font-medium text-gray-800 flex items-center gap-2 text-sm">
          {title}
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────

const SessionDetailModal: React.FC<Props> = ({ sessionId, onClose }) => {
  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, sum] = await Promise.all([
          CashSessionApiService.getById(sessionId),
          CashSessionApiService.getSummary(sessionId),
        ]);
        setSession(s);
        setSummary(sum);
      } catch {
        // silent – modal already shows loading
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet size={20} className="text-gray-500" />
            Detalle de Sesión #{sessionId}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 animate-pulse">Cargando...</div>
        ) : !session ? (
          <div className="p-8 text-center text-red-500">No se pudo cargar la sesión.</div>
        ) : (
          <div className="overflow-y-auto p-5 space-y-4">

            {/* Fechas */}
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Apertura</p>
                <p className="font-medium text-gray-800">{fmtDate(session.opening_date)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Cierre</p>
                <p className="font-medium text-gray-800">{fmtDate(session.closing_date)}</p>
              </div>
              {session.notes && (
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Nota</p>
                  <p className="text-gray-700">{session.notes}</p>
                </div>
              )}
            </div>

            {/* Resumen financiero */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Apertura',        value: summary?.opening_balance ?? session.opening_balance, color: 'text-gray-700' },
                { label: 'Ingresos',        value: summary?.total_income ?? 0,                          color: 'text-green-700' },
                { label: 'Gastos',          value: summary?.total_expenses ?? 0,                        color: 'text-red-700'   },
                { label: 'Bal. esperado',   value: summary?.expected_balance ?? session.expected_balance, color: 'text-purple-700' },
                { label: 'Bal. real',       value: session.closing_balance,                             color: 'text-blue-700'  },
                { label: 'Diferencia',
                  value: session.closing_balance - (summary?.expected_balance ?? session.expected_balance),
                  color: session.closing_balance >= (summary?.expected_balance ?? session.expected_balance)
                    ? 'text-green-700' : 'text-red-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className={`font-bold text-sm mt-0.5 ${color}`}>{fmt(value)}</p>
                </div>
              ))}
            </div>

            {/* Pagos órdenes rápidas */}
            <Section
              title={<><TrendingUp size={15} className="text-green-500" /> Pagos — Órdenes Rápidas</>}
              count={session.payments.length}
            >
              {session.payments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-5">Sin pagos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Orden</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {session.payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">#{p.simple_order_id}</td>
                        <td className="px-3 py-2 text-gray-500">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2 text-gray-500">{p.descripcion || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-green-700">
                        {fmt(session.payments.reduce((s, p) => s + p.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Section>

            {/* Pagos órdenes crédito */}
            <Section
              title={<><DollarSign size={15} className="text-blue-500" /> Pagos — Órdenes</>}
              count={session.order_payments.length}
            >
              {session.order_payments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-5">Sin pagos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Orden</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {session.order_payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{p.order_id ? `#${p.order_id}` : '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2 text-gray-500">{p.descripcion || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-blue-700">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">
                        {fmt(session.order_payments.reduce((s, p) => s + p.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Section>

            {/* Gastos */}
            <Section
              title={<><TrendingDown size={15} className="text-red-500" /> Gastos</>}
              count={session.expenses.length}
              defaultOpen
            >
              {session.expenses.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-5">Sin gastos.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-left">Registrado por</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {session.expenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 text-gray-700">{e.description}</td>
                        <td className="px-3 py-2 text-gray-500">{e.user_username || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-red-700">{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 font-semibold text-gray-600">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-red-700">
                        {fmt(session.expenses.reduce((s, e) => s + e.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetailModal;
