import React, { useEffect, useState } from 'react';
import { X, Loader, ShoppingBasket, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateMX } from '@/utils/dateUtils';
import { ShoppingListApiService } from '../ShoppingListApiService';
import type { ShoppingList } from '../types';

interface Props {
  listId: number;
  onClose: () => void;
  onOrderClick?: (orderId: number) => void;
}

const fmtDate = (d: string | null) => (d ? formatDateMX(d, 'DD MMM YYYY, h:mm A') : '—');

const ShoppingListDetailModal: React.FC<Props> = ({ listId, onClose, onOrderClick }) => {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ShoppingListApiService.getById(listId)
      .then(setList)
      .finally(() => setLoading(false));
  }, [listId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBasket size={20} className="text-blue-600" /> Lista de Compras #{listId}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader className="animate-spin text-gray-400" size={24} />
            </div>
          ) : !list ? (
            <p className="text-center text-gray-400 py-10">No se pudo cargar la lista.</p>
          ) : (
            <>
              <div className="text-sm text-gray-500 mb-4 space-y-1">
                <p>Abierta: {fmtDate(list.opening_date)}</p>
                <p>Cerrada: {fmtDate(list.closing_date)}</p>
                {list.notes && <p className="mt-2 bg-gray-50 rounded-lg p-2 text-gray-600">{list.notes}</p>}
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-center">Orden</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {list.items.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Sin productos registrados.</td></tr>
                  ) : list.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-700">{item.product_name || `Producto #${item.product_id}`}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">
                        {item.order_id ? (
                          onOrderClick ? (
                            <button
                              type="button"
                              onClick={() => onOrderClick(item.order_id!)}
                              className="inline-block px-2 py-1 font-semibold rounded text-xs bg-blue-50 text-blue-700 cursor-pointer hover:underline transition-opacity hover:opacity-80"
                              title="Ver orden"
                            >
                              #{item.order_id}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-600">#{item.order_id}</span>
                          )
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.purchased ? (
                          <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Comprado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400"><Circle size={14} /> Pendiente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListDetailModal;
