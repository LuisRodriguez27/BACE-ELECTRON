import React, { useState } from 'react';
import { Lock, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CashSession, CashSessionSummary, CloseCashSessionForm } from '../types';

interface Props {
  session: CashSession;
  summary: CashSessionSummary | null;
  onClose: () => void;
  onConfirm: (data: CloseCashSessionForm) => Promise<void>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const CloseSessionModal: React.FC<Props> = ({ session, summary, onClose, onConfirm }) => {
  const expected = summary?.expected_balance ?? session.expected_balance;
  const [balance, setBalance] = useState(expected.toFixed(2));
  const [notes,   setNotes]   = useState(session.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const closing   = parseFloat(balance) || 0;
  const diff      = closing - expected;
  const diffColor = diff < 0 ? 'text-red-600' : diff > 0 ? 'text-orange-600' : 'text-green-600';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(closing) || closing < 0) { setError('Ingresa un balance de cierre válido (≥ 0)'); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ closing_balance: closing, notes: notes.trim() || undefined });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lock size={20} className="text-red-600" /> Cerrar Sesión de Caja
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Summary mini */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Apertura</span><span className="font-medium">{fmt(summary?.opening_balance ?? session.opening_balance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ingresos</span><span className="font-medium text-green-700">+{fmt(summary?.total_income ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gastos</span><span className="font-medium text-red-700">−{fmt(summary?.total_expenses ?? 0)}</span></div>
            <div className="flex justify-between border-t pt-2 mt-1"><span className="font-semibold text-gray-700">Balance esperado</span><span className="font-bold">{fmt(expected)}</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Balance de cierre real ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            {!isNaN(closing) && (
              <p className={`text-xs mt-1 font-medium ${diffColor}`}>
                {diff === 0 ? '✓ Coincide con el balance esperado' : diff > 0 ? `▲ Sobrante: ${fmt(diff)}` : `▼ Faltante: ${fmt(Math.abs(diff))}`}
              </p>
            )}
          </div>

          {diff !== 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Hay una diferencia entre el balance esperado y el real. Asegúrate de verificarlo antes de cerrar.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas de cierre <span className="text-gray-400">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Observaciones de cierre..."
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Cerrando...' : 'Confirmar Cierre'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseSessionModal;
