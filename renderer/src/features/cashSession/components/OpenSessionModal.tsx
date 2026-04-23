import React, { useState } from 'react';
import { LockOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OpenCashSessionForm } from '../types';

interface Props {
  onClose: () => void;
  onConfirm: (data: OpenCashSessionForm) => Promise<void>;
}

const OpenSessionModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(balance);
    if (isNaN(b) || b < 0) { setError('Ingresa un balance de apertura válido (≥ 0)'); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ opening_balance: b });
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
            <LockOpen size={20} className="text-blue-600" /> Abrir Sesión de Caja
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Balance de apertura ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Efectivo en caja al inicio del día.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpenSessionModal;
