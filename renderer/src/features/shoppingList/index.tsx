import React, { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBasket,
  Plus,
  Lock,
  LockOpen,
  RefreshCw,
  AlertCircle,
  History,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateMX } from '@/utils/dateUtils';
import { usePermissions } from '@/hooks/use-permissions';
import { extractErrorMessage } from '@/utils/errorHandling';
import { useOrderDetailsModal } from '@/hooks/use-order-details-modal';

import { ShoppingListApiService } from './ShoppingListApiService';
import type { ShoppingList, Pagination, OpenShoppingListForm, CloseShoppingListForm, AddShoppingListItemForm } from './types';

import OpenShoppingListModal from './components/OpenShoppingListModal';
import CloseShoppingListModal from './components/CloseShoppingListModal';
import AddShoppingListItemModal from './components/AddShoppingListItemModal';
import ShoppingListDetailModal from './components/ShoppingListDetailModal';

const fmtDate = (d: string | null) => (d ? formatDateMX(d, 'DD MMM YYYY, h:mm A') : '—');

const ShoppingListPage: React.FC = () => {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkPermission, canAccess } = usePermissions();
  const { openOrder, orderDetailsModal } = useOrderDetailsModal();

  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [history, setHistory] = useState<ShoppingList[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const HISTORY_LIMIT = 15;

  const canManage = canAccess('Gestionar Lista de Compras');

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const active = await ShoppingListApiService.getActive();
      setList(active);
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Error al cargar la lista de compras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const fetchHistory = useCallback(async (page: number) => {
    try {
      setHistoryLoading(true);
      const res = await ShoppingListApiService.getHistory(page, HISTORY_LIMIT);
      setHistory(res.data);
      setHistoryPagination(res.pagination);
    } catch {
      toast.error('Error al cargar el historial');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory(historyPage);
  }, [tab, historyPage, fetchHistory]);

  const handleOpenClick = () => {
    if (!checkPermission('Gestionar Lista de Compras')) return;
    setShowOpen(true);
  };

  const handleOpen = async (data: OpenShoppingListForm) => {
    await ShoppingListApiService.open(data);
    toast.success('Lista de compras abierta correctamente');
    setShowOpen(false);
    fetchActive();
  };

  const handleCloseClick = () => {
    if (!checkPermission('Gestionar Lista de Compras')) return;
    setShowClose(true);
  };

  const handleClose = async (data: CloseShoppingListForm) => {
    if (!list) return;
    await ShoppingListApiService.close(list.id, data);
    toast.success('Lista de compras cerrada correctamente');
    setShowClose(false);
    fetchActive();
  };

  const handleAddClick = () => {
    if (!checkPermission('Gestionar Lista de Compras')) return;
    setShowAddItem(true);
  };

  const handleAddItem = async (data: AddShoppingListItemForm) => {
    await ShoppingListApiService.addItem(data);
    toast.success('Producto agregado a la lista de compras');
    setShowAddItem(false);
    fetchActive();
  };

  const handleTogglePurchased = async (itemId: number, purchased: boolean) => {
    if (!checkPermission('Gestionar Lista de Compras')) return;
    try {
      await ShoppingListApiService.updateItem(itemId, { purchased });
      fetchActive();
    } catch (err: any) {
      toast.error(extractErrorMessage(err) || 'Error al actualizar el producto');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!checkPermission('Gestionar Lista de Compras')) return;
    if (!confirm('¿Quitar este producto de la lista de compras?')) return;
    try {
      await ShoppingListApiService.removeItem(itemId);
      toast.success('Producto eliminado de la lista');
      fetchActive();
    } catch (err: any) {
      toast.error(extractErrorMessage(err) || 'Error al eliminar el producto');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchActive} className="ml-auto">
            <RefreshCw size={14} className="mr-1" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = list?.status === 'open';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--app-bg)] flex justify-between items-center mb-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Compras</h1>
          <p className="text-gray-500 mt-1">
            {list
              ? isOpen
                ? `Abierta el ${fmtDate(list.opening_date)}`
                : `Cerrada — ${fmtDate(list.closing_date)}`
              : 'No hay lista de compras activa'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchActive}>
            <RefreshCw size={14} className="mr-1" /> Actualizar
          </Button>
          {!list && canManage && (
            <Button onClick={handleOpenClick}>
              <LockOpen size={16} className="mr-2" /> Abrir Lista
            </Button>
          )}
          {isOpen && canManage && (
            <Button variant="destructive" onClick={handleCloseClick}>
              <Lock size={16} className="mr-2" /> Cerrar Lista
            </Button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBasket size={14} /> Lista Activa
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={14} /> Historial
        </button>
      </div>

      {/* ── ACTIVE TAB ─────────────────────────────────────────── */}
      {tab === 'active' && (
        <>
          {!list && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <ShoppingBasket size={40} className="mx-auto text-amber-400 mb-3" />
              <p className="text-amber-800 font-medium">No hay una lista de compras abierta.</p>
              <p className="text-amber-600 text-sm mt-1">Abre una lista para comenzar a agregar productos a comprar.</p>
              {canManage && (
                <Button className="mt-4" onClick={handleOpenClick}>
                  <LockOpen size={16} className="mr-2" /> Abrir Lista
                </Button>
              )}
            </div>
          )}

          {list && (
            <div className="bg-white rounded-lg shadow border border-gray-100">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  Productos
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {list.items.length}
                  </span>
                </span>
                {canManage && (
                  <Button size="sm" onClick={handleAddClick}>
                    <Plus size={14} className="mr-1" /> Agregar
                  </Button>
                )}
              </div>

              {list.notes && (
                <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 text-sm text-blue-800">
                  <span className="font-medium">Nota: </span>{list.notes}
                </div>
              )}

              <div className="overflow-x-auto">
                {list.items.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin productos agregados a esta lista.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-center">Orden</th>
                        <th className="px-4 py-3 text-center">Comprado</th>
                        {canManage && <th className="px-4 py-3 text-center">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {list.items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-700">{item.product_name || `Producto #${item.product_id}`}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-center">
                            {item.order_id ? (
                              <button
                                type="button"
                                onClick={() => openOrder(item.order_id!)}
                                className="inline-block px-2 py-1 font-semibold rounded text-xs bg-blue-50 text-blue-700 cursor-pointer hover:underline transition-opacity hover:opacity-80"
                                title="Ver orden"
                              >
                                #{item.order_id}
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={item.purchased}
                                onCheckedChange={(checked) => handleTogglePurchased(item.id, checked)}
                                disabled={!canManage}
                              />
                            </div>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                                title="Quitar de la lista"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Apertura</th>
                  <th className="px-4 py-3 text-left">Cierre</th>
                  <th className="px-4 py-3 text-right">Productos</th>
                  <th className="px-4 py-3 text-center">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(5)].map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No hay listas de compras cerradas registradas.
                    </td>
                  </tr>
                ) : history.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono">#{l.id}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(l.opening_date)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(l.closing_date)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{l.items.length}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDetailId(l.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historyPagination && historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Página {historyPagination.page} de {historyPagination.totalPages} — {historyPagination.total} listas
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={!historyPagination.hasPrev} onClick={() => setHistoryPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button size="sm" variant="outline" disabled={!historyPagination.hasNext} onClick={() => setHistoryPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showOpen && <OpenShoppingListModal onClose={() => setShowOpen(false)} onConfirm={handleOpen} />}
      {showClose && list && <CloseShoppingListModal list={list} onClose={() => setShowClose(false)} onConfirm={handleClose} />}
      {showAddItem && <AddShoppingListItemModal onClose={() => setShowAddItem(false)} onConfirm={handleAddItem} />}
      {detailId && <ShoppingListDetailModal listId={detailId} onClose={() => setDetailId(null)} onOrderClick={openOrder} />}

      {orderDetailsModal}
    </div>
  );
};

export default ShoppingListPage;
