import React, { useState, useEffect } from 'react';
import { Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isoToDatetimeLocalMX, nowDatetimeLocalMX } from '@/utils/dateUtils';
import type { Expense, CreateExpenseForm, UpdateExpenseForm } from '../types';
import { useAuthStore } from '@/store/auth';

interface Props {
  cashSessionId: number;
  expense: Expense | null;
  onClose: () => void;
  onCreate: (data: CreateExpenseForm) => Promise<void>;
  onUpdate: (id: number, data: UpdateExpenseForm) => Promise<void>;
}

const ExpenseFormModal: React.FC<Props> = ({ cashSessionId, expense, onClose, onCreate, onUpdate }) => {
  const { user } = useAuthStore();
  const isEditing = expense !== null;

  const [amount, setAmount] = useState(expense?.amount.toFixed(2) ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [date, setDate] = useState(
    expense?.date ? isoToDatetimeLocalMX(expense.date) : nowDatetimeLocalMX()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toFixed(2));
      setDescription(expense.description);
      setDate(isoToDatetimeLocalMX(expense.date));
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (isNaN(a) || a <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (!description.trim()) { setError('La descripción es requerida'); return; }
    if (!date) { setError('La fecha es requerida'); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && expense) {
        await onUpdate(expense.id, {
          amount: a,
          description: description.trim(),
          date: new Date(date).toISOString(),
          edited_by: user?.id,
        });
      } else {
        await onCreate({
          cash_session_id: cashSessionId,
          user_id: user?.id ?? 0,
          amount: a,
          description: description.trim(),
          date: new Date(date).toISOString(),
        });
      }
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
            <Receipt size={20} className="text-red-500" />
            {isEditing ? 'Editar Gasto' : 'Registrar Gasto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)*</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Concepto del gasto..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? 'Guardando...' : isEditing ? 'Actualizar Gasto' : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
