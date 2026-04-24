import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Lock,
  LockOpen,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatDateMX } from '@/utils/dateUtils';

import { CashSessionApiService, ExpensesApiService } from './CashSessionApiService';
import type {
  CashSession,
  CashSessionSummary,
  Expense,
  OpenCashSessionForm,
  CloseCashSessionForm,
  CreateExpenseForm,
  UpdateExpenseForm,
} from './types';

import OpenSessionModal from './components/OpenSessionModal';
import CloseSessionModal from './components/CloseSessionModal';
import ExpenseFormModal from './components/ExpenseFormModal';
import { usePermissions } from '@/hooks/use-permissions';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (d: string | null) =>
  d ? formatDateMX(d, 'DD MMM YYYY, h:mm A') : '—';

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
}

const COLOR_MAP: Record<StatCardProps['color'], string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg shadow border border-gray-100 p-4 flex items-center gap-4">
    <div className={`p-3 rounded-full shrink-0 ${COLOR_MAP[color]}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const CashSessionPage: React.FC = () => {
  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkPermission } = usePermissions();

  // expenses local (subset del session)
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // modals
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);

  // accordion
  const [showPayments, setShowPayments] = useState(false);
  const [showOrderPay, setShowOrderPay] = useState(false);
  const [showExpenses, setShowExpenses] = useState(true);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const active = await CashSessionApiService.getActive();
      setSession(active);

      if (active) {
        setExpenses(active.expenses ?? []);
        const s = await CashSessionApiService.getSummary(active.id);
        setSummary(s);
      } else {
        setExpenses([]);
        setSummary(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la sesión de caja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenClick = () => {
    if (!checkPermission("Abrir Caja")) {
      return;
    }
    setShowOpen(true);
  };

  const handleCloseClick = () => {
    if (!checkPermission("Cerrar Caja")) {
      return;
    }
    setShowClose(true);
  };

  const handleAddExpenseClick = () => {
    if (!checkPermission("Registrar Egreso")) {
      return;
    }
    setEditingExp(null);
    setShowExpForm(true);
  };

  const handleOpen = async (data: OpenCashSessionForm) => {
    if (!checkPermission("Abrir Caja")) {
      return;
    }
    
    try {
      await CashSessionApiService.open(data);
      toast.success('Sesión de caja abierta correctamente');
      setShowOpen(false);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || 'Error al abrir la sesión');
    }
  };

  const handleClose = async (data: CloseCashSessionForm) => {
    if (!session) return;
    try {
      if (!checkPermission("Cerrar Caja")) {
        return;
      }

      await CashSessionApiService.close(session.id, data);
      toast.success('Sesión de caja cerrada correctamente');
      setShowClose(false);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || 'Error al cerrar la sesión');
    }
  };

  const handleCreateExpense = async (data: CreateExpenseForm) => {
    try {
      if (!checkPermission("Registrar Egreso")) {
        return;
      }

      const created = await ExpensesApiService.create(data);
      setExpenses(prev => [...prev, created]);
      toast.success('Gasto registrado');
      setShowExpForm(false);
      fetchSession(); // refresca summary
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar gasto');
    }
  };

  const handleUpdateExpense = async (id: number, data: UpdateExpenseForm) => {
    try {
      const updated = await ExpensesApiService.update(id, data);
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      toast.success('Gasto actualizado');
      setEditingExp(null);
      setShowExpForm(false);
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar gasto');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
    try {
      await ExpensesApiService.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Gasto eliminado');
      fetchSession();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar gasto');
    }
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExp(expense);
    setShowExpForm(true);
  };

  const closeExpModal = () => {
    setEditingExp(null);
    setShowExpForm(false);
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchSession} className="ml-auto">
            <RefreshCw size={14} className="mr-1" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = session?.status === 'open';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesión de Caja</h1>
          <p className="text-gray-500 mt-1">
            {session
              ? isOpen
                ? `Abierta el ${fmtDate(session.opening_date)}`
                : `Cerrada — ${fmtDate(session.closing_date)}`
              : 'No hay sesión de caja activa'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSession}>
            <RefreshCw size={14} className="mr-1" /> Actualizar
          </Button>
          {!session && (
            <Button onClick={handleOpenClick}>
              <LockOpen size={16} className="mr-2" /> Abrir Caja
            </Button>
          )}
          {isOpen && (
            <Button variant="destructive" onClick={handleCloseClick}>
              <Lock size={16} className="mr-2" /> Cerrar Caja
            </Button>
          )}
        </div>
      </div>

      {/* No session banner */}
      {!session && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <Wallet size={40} className="mx-auto text-amber-400 mb-3" />
          <p className="text-amber-800 font-medium">No hay una sesión de caja abierta.</p>
          <p className="text-amber-600 text-sm mt-1">Abre una sesión para comenzar a registrar movimientos del día.</p>
          <Button className="mt-4" onClick={handleOpenClick}>
            <LockOpen size={16} className="mr-2" /> Abrir Caja
          </Button>
        </div>
      )}

      {session && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Balance apertura" value={fmt(summary?.opening_balance ?? session.opening_balance)} icon={Wallet} color="blue" />
            <StatCard label="Ingresos del día" value={fmt(summary?.total_income ?? 0)} icon={TrendingUp} color="green" />
            <StatCard label="Gastos del día" value={fmt(summary?.total_expenses ?? 0)} icon={TrendingDown} color="red" />
            <StatCard label="Balance esperado" value={fmt(summary?.expected_balance ?? session.expected_balance)} icon={DollarSign} color="purple" />
          </div>

          {/* Session notes */}
          {session.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800">
              <span className="font-medium">Nota: </span>{session.notes}
            </div>
          )}

          {/* ── Simple Order Payments accordion ─────────────────────────────── */}
          <div className="bg-white rounded-lg shadow border border-gray-100 mb-4">
            <button
              className="w-full flex justify-between items-center px-5 py-4 text-left"
              onClick={() => setShowPayments(v => !v)}
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-500" />
                Pagos — Órdenes Rápidas
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {session.payments.length}
                </span>
              </span>
              {showPayments ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showPayments && (
              <div className="border-t border-gray-100 overflow-x-auto">
                {session.payments.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Sin pagos de órdenes rápidas en esta sesión.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">ID</th>
                        <th className="px-4 py-3 text-left">Orden</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Descripción</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {session.payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">#{p.id}</td>
                          <td className="px-4 py-3 text-gray-700">Orden #{p.simple_order_id}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(p.date)}</td>
                          <td className="px-4 py-3 text-gray-500">{p.descripcion || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-600">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {fmt(session.payments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ── Order Payments accordion ─────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow border border-gray-100 mb-4">
            <button
              className="w-full flex justify-between items-center px-5 py-4 text-left"
              onClick={() => setShowOrderPay(v => !v)}
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign size={18} className="text-blue-500" />
                Pagos — Órdenes
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {session.order_payments.length}
                </span>
              </span>
              {showOrderPay ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showOrderPay && (
              <div className="border-t border-gray-100 overflow-x-auto">
                {session.order_payments.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Sin pagos de órdenes de crédito en esta sesión.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">ID</th>
                        <th className="px-4 py-3 text-left">Orden</th>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Descripción</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {session.order_payments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">#{p.id}</td>
                          <td className="px-4 py-3 text-gray-700">{p.order_id ? `Orden #${p.order_id}` : '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{fmtDate(p.date)}</td>
                          <td className="px-4 py-3 text-gray-500">{p.descripcion || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-700">{fmt(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-600">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {fmt(session.order_payments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* ── Expenses accordion ────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg shadow border border-gray-100 mb-4">
            <div className="flex items-center justify-between px-5 py-4">
              <button
                className="flex-1 flex justify-between items-center text-left"
                onClick={() => setShowExpenses(v => !v)}
              >
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingDown size={18} className="text-red-500" />
                  Gastos
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {expenses.length}
                  </span>
                </span>
                {showExpenses ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <Button size="sm" className="ml-3" onClick={handleAddExpenseClick}>
                  <Plus size={14} className="mr-1" /> Agregar
                </Button>
              )}
            </div>
            {showExpenses && (
              <div className="border-t border-gray-100 overflow-x-auto">
                {expenses.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Sin gastos registrados en esta sesión.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Descripción</th>
                        <th className="px-4 py-3 text-left">Registrado por</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        {isOpen && <th className="px-4 py-3 text-center">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{fmtDate(e.date)}</td>
                          <td className="px-4 py-3 text-gray-700">{e.description}</td>
                          <td className="px-4 py-3 text-gray-500">{e.user_username || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-700">{fmt(e.amount)}</td>
                          {isOpen && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => openEditExpense(e)}
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(e.id)}
                                  className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-200 bg-gray-50">
                      <tr>
                        <td colSpan={isOpen ? 3 : 3} className="px-4 py-3 text-sm font-semibold text-gray-600">Total gastos</td>
                        <td className="px-4 py-3 text-right font-bold text-red-700">
                          {fmt(expenses.reduce((s, e) => s + e.amount, 0))}
                        </td>
                        {isOpen && <td />}
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showOpen && (
        <OpenSessionModal
          onClose={() => setShowOpen(false)}
          onConfirm={handleOpen}
        />
      )}

      {showClose && session && (
        <CloseSessionModal
          session={session}
          summary={summary}
          onClose={() => setShowClose(false)}
          onConfirm={handleClose}
        />
      )}

      {showExpForm && session && (
        <ExpenseFormModal
          cashSessionId={session.id}
          expense={editingExp}
          onClose={closeExpModal}
          onCreate={handleCreateExpense}
          onUpdate={handleUpdateExpense}
        />
      )}
    </div>
  );
};

export default CashSessionPage;
