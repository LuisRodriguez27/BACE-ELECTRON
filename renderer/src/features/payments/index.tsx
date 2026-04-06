import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard, DollarSign, Calendar, Receipt, Tag, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentsApiService } from './PaymentsApiService';
import { OrdersApiService } from '../orders/OrdersApiService';
import type { Payment } from './types';
import type { Order } from '../orders/types';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDateMX } from '@/utils/dateUtils';
import CreatePaymentModal from './components/CreatePaymentModal';
import EditPaymentModal from './components/EditPaymentModal';
import PaymentsLogbookModal from './components/PaymentsLogbookModal';

const PaymentsPage: React.FC = () => {

  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | 'free' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'payment_id' | 'order_id' | 'amount' | 'method' | 'info'>('payment_id');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [logbookModalOpen, setLogbookModalOpen] = useState(false);

  const { checkPermission } = usePermissions();

  // ─── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [ordersData, all] = await Promise.all([
          OrdersApiService.findAll(),
          PaymentsApiService.getAll()
        ]);
        setOrders(ordersData);
        setAllPayments(all);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ─── Filtrar pagos según la selección ────────────────────────────────────
  const applyFilter = (orderId: number | 'free' | null, list: Payment[]) => {
    if (orderId === null) return list; // todos
    if (orderId === 'free') return list.filter(p => !p.order_id);
    return list.filter(p => p.order_id === orderId);
  };

  const filteredPayments = applyFilter(selectedOrderId, allPayments).filter(p => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.trim().toLowerCase();
    switch (searchType) {
      case 'payment_id':
        return p.id?.toString().includes(t);
      case 'order_id':
        return p.order_id?.toString().includes(t);
      case 'amount':
        return p.amount?.toString().includes(t);
      case 'method':
        return p.descripcion?.toLowerCase().includes(t);
      case 'info':
        return p.info?.toLowerCase().includes(t);
      default:
        return true;
    }
  });

  // ─── Helpers ────────────────────────────────────────────────────────────
  const handleOrderChange = (value: string) => {
    if (value === '') {
      setSelectedOrderId(null);
    } else if (value === 'free') {
      setSelectedOrderId('free');
    } else {
      setSelectedOrderId(Number(value));
    }
  };

  const getSelectedOrder = (): Order | undefined => {
    if (!selectedOrderId || selectedOrderId === 'free') return undefined;
    return orders.find(o => o.id === selectedOrderId);
  };

  const currentOrderTotal = getSelectedOrder()?.total ?? 0;
  const totalPaidForOrder = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  const remainingForOrder = currentOrderTotal - totalPaidForOrder;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return formatDateMX(dateString, 'D MMM YYYY h:mm A');
  };

  // ─── Callbacks de modales ────────────────────────────────────────────────
  const handlePaymentCreated = (newPayment: Payment) => {
    const updated = [newPayment, ...allPayments];
    setAllPayments(updated);
  };

  const handlePaymentUpdated = (updatedPayment: Payment) => {
    const updated = allPayments.map(p => p.id === updatedPayment.id ? updatedPayment : p);
    setAllPayments(updated);
  };

  const handlePaymentDeleted = (paymentId: number) => {
    const updated = allPayments.filter(p => p.id !== paymentId);
    setAllPayments(updated);
    setSelectedPayment(null);
  };

  const openCreateModal = () => {
    if (!checkPermission('Registrar Pagos')) return;
    setCreateModalOpen(true);
  };

  const openEditModal = (payment: Payment) => {
    if (!checkPermission('Eliminar Pagos')) return;
    setSelectedPayment(payment);
    setEditModalOpen(true);
  };

  // ─── Calcular pagos actuales para el EditModal (excluyendo el pago editado)
  const getOtherPaymentsTotal = (payment: Payment) => {
    if (!payment.order_id) return 0;
    return allPayments
      .filter(p => p.order_id === payment.order_id && p.id !== payment.id)
      .reduce((acc, p) => acc + p.amount, 0);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-2"
            size="sm"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const selectedOrder = getSelectedOrder();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-600 mt-1">
            Administra los pagos de órdenes o registra pagos libres
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setLogbookModalOpen(true)}
          >
            <BookOpen size={16} />
            Bitácora
          </Button>
          <Button 
            className="flex items-center gap-2" 
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Nuevo Pago
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Orden:
            </label>
            <select
              value={selectedOrderId === null ? '' : selectedOrderId === 'free' ? 'free' : String(selectedOrderId)}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los pagos</option>
              <option value="free">Pagos libres (sin orden)</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Orden #{order.id} — {order.client?.name} — ${order.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar:
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              {/* Selector de tipo */}
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value as typeof searchType);
                  setSearchTerm('');
                }}
                className="px-3 py-2 border-r border-gray-300 bg-gray-50 text-sm text-gray-700 focus:outline-none"
              >
                <option value="payment_id"># Pago</option>
                <option value="order_id"># Orden</option>
                <option value="amount">Monto</option>
                <option value="method">Método</option>
                <option value="info">Concepto</option>
              </select>

              {/* Campo de búsqueda */}
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
                      type={searchType === 'payment_id' || searchType === 'order_id' || searchType === 'amount' ? 'number' : 'text'}
                      placeholder={
                        searchType === 'payment_id' ? 'ID del pago...'
                        : searchType === 'order_id' ? 'ID de la orden...'
                        : searchType === 'amount' ? 'Monto...'
                        : 'Concepto del pago...'
                      }
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none bg-white"
                    />
                  </>
                )}
              </div>

              {/* Limpiar búsqueda */}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 text-gray-400 hover:text-gray-600 border-l border-gray-300"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen — solo cuando hay orden seleccionada */}
      {selectedOrder && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Total Orden</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ${selectedOrder.total.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Total Pagado</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${totalPaidForOrder.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Pendiente</h3>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${remainingForOrder.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Num. Pagos</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {filteredPayments.length}
            </p>
          </div>
        </div>
      )}

      {/* Lista de pagos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedOrderId === null && 'Todos los pagos'}
            {selectedOrderId === 'free' && 'Pagos libres (sin orden)'}
            {selectedOrderId !== null && selectedOrderId !== 'free' && `Pagos de la Orden #${selectedOrderId}`}
            {' '}({filteredPayments.length})
          </h2>
          {selectedOrderId === 'free' && (
            <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              Sin orden asociada
            </span>
          )}
        </div>

        <div className="p-6">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
              <p className="text-gray-500 mb-4">
                {selectedOrderId === 'free'
                  ? 'No hay pagos libres registrados'
                  : selectedOrderId
                  ? 'Esta orden aún no tiene pagos registrados'
                  : 'No hay pagos registrados'}
              </p>
              <Button
                className="flex items-center gap-2 mx-auto"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Registrar Pago
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900">Pago #{payment.id}</h3>
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
                          {payment.order_id && (
                            <div className="flex items-center gap-1">
                              <Receipt size={14} />
                              <span>Orden #{payment.order_id}</span>
                            </div>
                          )}
                          {!payment.order_id && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              Pago libre
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(payment)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>

                  {/* Info / método */}
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
            </div>
          )}
        </div>
      </div>

      {/* Modal de creación */}
      <CreatePaymentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        orderId={selectedOrderId !== null && selectedOrderId !== 'free' ? selectedOrderId : undefined}
        orderTotal={selectedOrder?.total}
        currentPayments={selectedOrderId !== null && selectedOrderId !== 'free'
          ? allPayments.filter(p => p.order_id === selectedOrderId).reduce((acc, p) => acc + p.amount, 0)
          : 0}
        onPaymentCreated={handlePaymentCreated}
        clientName={selectedOrder?.client?.name}
        isSimpleOrder={false}
      />

      {/* Modal de edición */}
      <EditPaymentModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setSelectedPayment(null); }}
        payment={selectedPayment}
        orderTotal={selectedPayment?.order?.total ?? selectedPayment?.order_id
          ? orders.find(o => o.id === selectedPayment?.order_id)?.total ?? 0
          : 0}
        currentPayments={selectedPayment ? getOtherPaymentsTotal(selectedPayment) : 0}
        onPaymentUpdated={handlePaymentUpdated}
        onPaymentDeleted={handlePaymentDeleted}
        clientName={selectedPayment?.order_id
          ? orders.find(o => o.id === selectedPayment.order_id)?.client?.name ?? 'Sin cliente'
          : 'Pago libre'}
        isSimpleOrder={false}
      />
      {/* Modal de bitácora */}
      <PaymentsLogbookModal
        isOpen={logbookModalOpen}
        onClose={() => setLogbookModalOpen(false)}
        payments={allPayments}
        orders={orders}
      />
    </div>
  );
};

export default PaymentsPage;
