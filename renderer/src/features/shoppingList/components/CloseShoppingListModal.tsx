import React, { useState } from 'react';
import { Lock, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/utils/errorHandling';
import type { ShoppingList, CloseShoppingListForm } from '../types';

interface Props {
  list: ShoppingList;
  onClose: () => void;
  onConfirm: (data: CloseShoppingListForm) => Promise<void>;
}

const CloseShoppingListModal: React.FC<Props> = ({ list, onClose, onConfirm }) => {
  const [notes, setNotes] = useState(list.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = list.items.filter(i => i.active && !i.purchased).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ notes: notes.trim() || undefined });
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lock size={20} className="text-red-600" /> Cerrar Lista de Compras
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Todavía hay {pending} producto(s) pendientes por comprar en esta lista.
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

export default CloseShoppingListModal;
