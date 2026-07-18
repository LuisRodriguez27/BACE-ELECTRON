import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Search, CreditCard, DollarSign, Calendar,
  Receipt, Tag, BookOpen, Loader2, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentsApiService } from './PaymentsApiService';
import { OrdersApiService } from '../orders/OrdersApiService';
import type { Payment, PaymentFilters } from './types';
import type { Order } from '../orders/types';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrderDetailsModal } from '@/hooks/use-order-details-modal';
import { formatDateMX } from '@/utils/dateUtils';
import CreatePaymentModal from './components/CreatePaymentModal';
import EditPaymentModal from './components/EditPaymentModal';
import PaymentsLogbookModal from './components/PaymentsLogbookModal';

const PAGE_LIMIT = 20;

const PaymentsPage: React.FC = () => {

  // ─── Órdenes (carga única) ─────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState<number | 'free' | 'simple' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'payment_id' | 'order_id' | 'amount' | 'method' | 'info'>('payment_id');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ─── Scroll infinito ───────────────────────────────────────────────────────
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nextPage, setNextPage] = useState(2);      // próxima página a cargar
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);   // true inicial → muestra skeleton
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState(0);      // fuerza reload en CRUD

  const loadingMoreRef = useRef(false); // evita cargas concurrentes en el observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ─── Modales ───────────────────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editCurrentPayments, setEditCurrentPayments] = useState(0);
  const [editOrderTotal, setEditOrderTotal] = useState(0);
  const [logbookModalOpen, setLogbookModalOpen] = useState(false);

  const { checkPermission } = usePermissions();
  const { openOrder, orderDetailsModal } = useOrderDetailsModal();

  // ─── Carga de órdenes ─────────────────────────────────────────────────────
  useEffect(() => {
    OrdersApiService.findAll().then(setOrders).catch(console.error);
  }, []);

  // ─── Debounce 400ms ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ─── Helper: construye filtros según estado actual ─────────────────────────
  const buildFilters = useCallback((): PaymentFilters => ({
    orderFilter: selectedOrderId,
    ...(debouncedSearch.trim()
      ? { searchType, searchTerm: debouncedSearch.trim() }
      : {}),
  }), [selectedOrderId, debouncedSearch, searchType]);

  // ─── Carga inicial (página 1) ──────────────────────────────────────────────
  // Se ejecuta cuando cambia algún filtro o filterKey (CRUD reload)
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setPayments([]);
    setHasMore(false);
    setNextPage(2);
    setTotalCount(0);
    setError(null);

    const doLoad = async () => {
      try {
        if (typeof selectedOrderId === 'number') {
          // Orden específica → todos los pagos de esa orden (sin paginar)
          const data = await PaymentsApiService.findByOrderId(selectedOrderId);
          if (!cancelled) {
            setPayments(data);
            setTotalCount(data.length);
          }
        } else {
          const result = await PaymentsApiService.getPaginated(1, PAGE_LIMIT, buildFilters());
          if (!cancelled) {
            setPayments(result.data);
            setHasMore(result.pagination.hasNext);
            setTotalCount(result.pagination.total);
          }
        }
      } catch {
        if (!cancelled) setError('Error al cargar pagos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doLoad();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, debouncedSearch, searchType, filterKey]);

  // ─── Cargar más páginas (scroll infinito) ─────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading || typeof selectedOrderId === 'number') return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const result = await PaymentsApiService.getPaginated(nextPage, PAGE_LIMIT, buildFilters());
      setPayments(prev => {
        const existingIds = new Set(prev.map(p => `${p.is_simple_order ? 'sop' : 'p'}-${p.id}`));
        const newUnique = result.data.filter(p => !existingIds.has(`${p.is_simple_order ? 'sop' : 'p'}-${p.id}`));
        return [...prev, ...newUnique];
      });
      setHasMore(result.pagination.hasNext);
      setNextPage(p => p + 1);
    } catch {
      // falla silenciosa — no interrumpe la experiencia
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [hasMore, loading, nextPage, selectedOrderId, buildFilters]);

  // ─── Scroll listener para cargar más ─────────────────────────────────────
  // IntersectionObserver con root:null falla cuando el scroll ocurre en un
  // div contenedor (no en window). getBoundingClientRect() sí funciona con
  // cualquier contenedor scrolleable porque devuelve posición vs. viewport.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => { loadMoreRef.current = loadMore; }); // actualizar en cada render

  useEffect(() => {
    const check = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      // Disparar 300px antes de que el sentinel llegue al borde visible
      if (rect.top <= window.innerHeight + 300) {
        loadMoreRef.current();
      }
    };

    // capture: true → captura el evento en cualquier elemento scrolleable de la app
    document.addEventListener('scroll', check, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', check, { capture: true });
  }, []); // sin deps — vive todo el ciclo del componente

  // ─── Helpers de filtros ────────────────────────────────────────────────────
  const handleOrderChange = (value: string) => {
    setSearchTerm('');
    setDebouncedSearch('');
    if (value === '') setSelectedOrderId(null);
    else if (value === 'free') setSelectedOrderId('free');
    else if (value === 'simple') setSelectedOrderId('simple');
    else setSelectedOrderId(Number(value));
  };

  const handleSearchTypeChange = (newType: typeof searchType) => {
    setSearchType(newType);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  // ─── Resumen de orden seleccionada ────────────────────────────────────────
  const selectedOrder = typeof selectedOrderId === 'number' ? orders.find(o => o.id === selectedOrderId) : undefined;
  const currentOrderTotal = selectedOrder?.total ?? 0;
  const totalPaidForOrder = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingForOrder = currentOrderTotal - totalPaidForOrder;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return formatDateMX(dateString, 'D MMM YYYY h:mm A');
  };

  // ─── CRUD callbacks ───────────────────────────────────────────────────────
  const handlePaymentCreated = (_p: Payment) => {
    // Nuevo pago → recarga desde página 1 (aparece al tope)
    setFilterKey(k => k + 1);
  };

  const handlePaymentUpdated = (updated: Payment) => {
    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handlePaymentDeleted = (paymentId: number) => {
    setSelectedPayment(null);
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    setTotalCount(c => c - 1);
  };

  const openCreateModal = () => {
    if (!checkPermission('Registrar Pagos')) return;
    setCreateModalOpen(true);
  };

  const openEditModal = async (payment: Payment) => {
    if (!checkPermission('Eliminar Pagos')) return;
    setSelectedPayment(payment);

    if (payment.order_id) {
      try {
        const source =
          typeof selectedOrderId === 'number' && selectedOrderId === payment.order_id
            ? payments
            : await PaymentsApiService.findByOrderId(payment.order_id);
        setEditCurrentPayments(
          source.filter(p => p.id !== payment.id).reduce((acc, p) => acc + p.amount, 0)
        );
      } catch {
        setEditCurrentPayments(0);
      }
      setEditOrderTotal(
        payment.order?.total ?? orders.find(o => o.id === payment.order_id)?.total ?? 0
      );
    } else {
      setEditCurrentPayments(0);
      setEditOrderTotal(0);
    }
    setEditModalOpen(true);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-16 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={() => setFilterKey(k => k + 1)} className="mt-2" size="sm">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-600 mt-1">Administra los pagos de órdenes o registra pagos libres</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setLogbookModalOpen(true)}>
            <BookOpen size={16} />
            Bitácora
          </Button>
          <Button className="flex items-center gap-2" onClick={openCreateModal}>
            <Plus size={16} />
            Nuevo Pago
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtro por orden */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Orden:</label>
            <select
              value={selectedOrderId === null ? '' : selectedOrderId === 'free' ? 'free' : selectedOrderId === 'simple' ? 'simple' : String(selectedOrderId)}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los pagos</option>
              <option value="free">Pagos libres (sin orden)</option>
              <option value="simple">Órdenes rápidas</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Orden #{order.id} — {order.client?.name} — ${order.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar:</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <select
                value={searchType}
                onChange={(e) => handleSearchTypeChange(e.target.value as typeof searchType)}
                className="px-3 py-2 border-r border-gray-300 bg-gray-50 text-sm text-gray-700 focus:outline-none"
              >
                <option value="payment_id"># Pago</option>
                <option value="order_id"># Orden</option>
                <option value="amount">Monto</option>
                <option value="method">Método</option>
                <option value="info">Concepto</option>
              </select>

              <div className="relative flex-1">
                {searchType === 'method' ? (
                  <select
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm focus:outline-none bg-white"
                  >
                    <option value="">Todos los métodos</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Otro">Otro</option>
                  </select>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                    <input
                      type={['payment_id', 'order_id', 'amount'].includes(searchType) ? 'number' : 'text'}
                      placeholder={
                        searchType === 'payment_id' ? 'ID del pago...' :
                          searchType === 'order_id' ? 'ID de la orden...' :
                            searchType === 'amount' ? 'Monto...' : 'Concepto del pago...'
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none bg-white"
                    />
                  </>
                )}
              </div>

              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
                  className="px-3 text-gray-400 hover:text-gray-600 border-l border-gray-300"
                  title="Limpiar búsqueda"
                >✕</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen — solo cuando hay orden seleccionada */}
      {selectedOrder && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Orden', value: currentOrderTotal, color: 'blue', icon: Receipt },
            { label: 'Total Pagado', value: totalPaidForOrder, color: 'green', icon: DollarSign },
            { label: 'Pendiente', value: remainingForOrder, color: 'orange', icon: CreditCard },
            { label: 'Num. Pagos', value: payments.length, color: 'purple', icon: Receipt, isCount: true },
          ].map(({ label, value, color, icon: Icon, isCount }) => (
            <div key={label} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 text-${color}-600`} />
                <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
              </div>
              <p className={`text-2xl font-bold text-${color}-600`}>
                {isCount ? value : `$${(value as number).toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de pagos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedOrderId === null && 'Todos los pagos'}
            {selectedOrderId === 'free' && 'Pagos libres (sin orden)'}
            {selectedOrderId === 'simple' && 'Pagos de Órdenes rápidas'}
            {typeof selectedOrderId === 'number' && `Pagos de la Orden #${selectedOrderId}`}
            {' '}
            <span className="text-gray-400 font-normal text-sm">({totalCount})</span>
          </h2>
        </div>

        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
              <p className="text-gray-500 mb-4">
                {selectedOrderId === 'free'
                  ? 'No hay pagos libres registrados'
                  : selectedOrderId === 'simple'
                    ? 'No hay pagos de órdenes rápidas registrados'
                    : typeof selectedOrderId === 'number'
                      ? 'Esta orden aún no tiene pagos registrados'
                      : 'No hay pagos que coincidan con los filtros'}
              </p>
              <Button className="flex items-center gap-2 mx-auto" onClick={openCreateModal}>
                <Plus size={16} />
                Registrar Pago
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.is_simple_order ? `sop-${payment.id}` : `p-${payment.id}`} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {payment.is_simple_order 
                            ? `Pago (Rápida) #${payment.id}` 
                            : payment.order_id 
                              ? `Pago #${payment.id}` 
                              : `Pago Libre #${payment.id}`}
                          {(payment.client_name || payment.order?.client_name) && (
                            <span className="text-gray-500 font-normal"> — {payment.client_name || payment.order?.client_name}</span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(payment.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            <span className="font-semibold text-green-600">
                              ${payment.amount.toFixed(2)} MXN
                            </span>
                          </div>
                          {payment.is_simple_order ? (
                            <div className="flex items-center gap-1">
                              <Receipt size={14} />
                              <span>Orden Rápida #{payment.simple_order_id}</span>
                            </div>
                          ) : payment.order_id ? (
                            <button
                              type="button"
                              onClick={() => openOrder(payment.order_id!)}
                              className="flex items-center gap-1 text-blue-700 hover:underline cursor-pointer"
                              title="Ver orden"
                            >
                              <Receipt size={14} />
                              <span>Orden #{payment.order_id}</span>
                            </button>
                          ) : (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              Pago libre
                            </span>
                          )}
                          {(payment.phone || payment.order?.client_phone) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Phone size={12} />
                              <span>{payment.phone || payment.order?.client_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditModal(payment)}>
                      Editar
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    {payment.descripcion && (
                      <div className="flex-1 bg-gray-50 rounded p-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Método de pago</span>
                        <p className="text-sm text-gray-800 mt-0.5">{payment.descripcion}</p>
                      </div>
                    )}
                    {payment.info && (
                      <div className="flex-1 bg-orange-50 rounded p-3">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Tag size={12} className="text-orange-500" />
                          <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Concepto / Info</span>
                        </div>
                        <p className="text-sm text-orange-900">{payment.info}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Sentinel invisible al final de la lista */}
              <div ref={sentinelRef} className="h-1" />

              {/* Spinner de carga adicional */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                </div>
              )}

              {/* Indicador de fin */}
              {!hasMore && totalCount > PAGE_LIMIT && typeof selectedOrderId !== 'number' && (
                <p className="text-center text-xs text-gray-400 py-2">
                  — {payments.length} de {totalCount} pagos —
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <CreatePaymentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        orderId={typeof selectedOrderId === 'number' ? selectedOrderId : undefined}
        orderTotal={selectedOrder?.total}
        currentPayments={typeof selectedOrderId === 'number' ? totalPaidForOrder : 0}
        onPaymentCreated={handlePaymentCreated}
        clientName={selectedOrder?.client?.name}
        isSimpleOrder={false}
      />

      <EditPaymentModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedPayment(null); }}
        payment={selectedPayment}
        orderTotal={editOrderTotal}
        currentPayments={editCurrentPayments}
        onPaymentUpdated={handlePaymentUpdated}
        onPaymentDeleted={handlePaymentDeleted}
        clientName={
          selectedPayment?.is_simple_order
            ? selectedPayment.order?.client_name || 'Orden Rápida'
            : selectedPayment?.order_id
              ? orders.find(o => o.id === selectedPayment.order_id)?.client?.name ?? 'Sin cliente'
              : selectedPayment?.client_name || 'Pago libre'
        }
        isSimpleOrder={selectedPayment?.is_simple_order || false}
      />

      <PaymentsLogbookModal
        isOpen={logbookModalOpen}
        onClose={() => setLogbookModalOpen(false)}
        orders={orders}
      />

      {orderDetailsModal}
    </div>
  );
};

export default PaymentsPage;
