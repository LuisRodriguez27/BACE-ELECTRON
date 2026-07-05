import React, { useState } from 'react';
import { ShoppingBasket, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/utils/errorHandling';
import { ShoppingListApiService } from '../ShoppingListApiService';

interface Props {
  productId: number;
  productName: string;
  defaultQuantity: number;
  onClose: () => void;
  onAdded?: () => void;
}

const QuickAddToShoppingListModal: React.FC<Props> = ({ productId, productName, defaultQuantity, onClose, onAdded }) => {
  const [quantity, setQuantity] = useState(String(defaultQuantity));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) { setError('Ingresa una cantidad válida (> 0)'); return; }
    setLoading(true);
    setError(null);
    try {
      await ShoppingListApiService.addItem({ product_id: productId, quantity: qty });
      toast.success(`${productName} agregado a la lista de compras`);
      onAdded?.();
      onClose();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBasket size={20} className="text-blue-600" /> Agregar a Lista de Compras
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            ¿Cuántas unidades de <span className="font-medium text-gray-900">{productName}</span> deseas agregar a la lista de compras?
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              autoFocus
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddToShoppingListModal;
