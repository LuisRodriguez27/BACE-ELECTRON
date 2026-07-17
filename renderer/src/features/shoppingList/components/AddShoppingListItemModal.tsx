import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductsApiService } from '@/features/products/ProductsApiService';
import { extractErrorMessage } from '@/utils/errorHandling';
import type { Product } from '@/features/products/types';
import type { AddShoppingListItemForm } from '../types';

interface Props {
  onClose: () => void;
  onConfirm: (data: AddShoppingListItemForm) => Promise<void>;
}

const AddShoppingListItemModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ProductsApiService.findAll()
      .then(setProducts)
      .catch(() => setError('Error al cargar los productos'))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(productId, 10);
    const qty = parseFloat(quantity);
    if (!id) { setError('Selecciona un producto de producto'); return; }
    if (isNaN(qty) || qty <= 0) { setError('Ingresa una cantidad válida (> 0)'); return; }
    setLoading(true);
    setError(null);
    try {
      await onConfirm({ product_id: id, quantity: qty });
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
            <Plus size={20} className="text-blue-600" /> Agregar a la Lista de Compras
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Productos</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              disabled={loadingProducts}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">{loadingProducts ? 'Cargando...' : 'Selecciona un producto'}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
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

export default AddShoppingListItemModal;
