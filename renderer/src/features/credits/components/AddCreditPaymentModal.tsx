import React, { useState } from 'react';
import { CircleDollarSign, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { nowDatetimeLocalMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import { creditPaymentSchema, type CreditPaymentMethod } from '../types';

interface Props {
  creditId: number;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}

const AddCreditPaymentModal: React.FC<Props> = ({ creditId, balance, onClose, onSaved }) => {
  const user = useAuthStore(state => state.user);
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [date, setDate] = useState(nowDatetimeLocalMX());
  const [method, setMethod] = useState<CreditPaymentMethod>('Efectivo');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      setError('No hay un usuario activo');
      return;
    }

    const parsed = creditPaymentSchema.safeParse({
      amount: Number(amount),
      date,
      payment_method: method,
      info,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Revisa los datos del abono');
      return;
    }
    if (parsed.data.amount > balance + 0.01) {
      setError(`El abono no puede exceder el saldo de $${balance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await CreditApiService.addPayment({
        credit_id: creditId,
        created_by: user.id,
        amount: parsed.data.amount,
        date: new Date(parsed.data.date).toISOString(),
        payment_method: parsed.data.payment_method,
        info: parsed.data.info?.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CircleDollarSign size={20} className="text-green-600" /> Registrar abono
            </h2>
            <p className="mt-1 text-sm text-gray-500">Saldo actual: ${balance.toFixed(2)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              type="number"
              min="0.01"
              max={balance}
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
            <input
              type="datetime-local"
              value={date}
              onChange={event => setDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago *</label>
            <select
              value={method}
              onChange={event => setMethod(event.target.value as CreditPaymentMethod)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / información</label>
            <input
              value={info}
              onChange={event => setInfo(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
              placeholder={`Abono a crédito #${creditId}`}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            El abono se registrará también en Pagos y en la sesión de caja activa.
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Registrando...' : 'Registrar abono'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditPaymentModal;

