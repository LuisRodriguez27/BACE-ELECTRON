import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, DollarSign, Plus, Search, ShoppingCart, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateMX, nowISO } from '@/utils/dateUtils';

import { SimpleOrdersApiService } from './SimpleOrdersApiService';
import { generateSimpleOrdersLogbookHtml } from './logbook';
import type { SimpleOrder, SimpleOrderPayment } from './types';
import CreatePaymentModal from '../payments/components/CreatePaymentModal';
import CreateSimpleOrderModal from './components/CreateSimpleOrderModal';
import EditSimpleOrderModal from './components/EditSimpleOrderModal';
import EditPaymentModal from '../payments/components/EditPaymentModal';
import SimpleOrderPrintPreviewModal from './components/SimpleOrderPrintPreviewModal';
import { Eye, Pencil, MoreVertical } from 'lucide-react';



const SimpleOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<number | null>(null);

  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const [globalStats, setGlobalStats] = useState({
    totalCount: 0,
    totalRevenues: 0,
    totalPending: 0
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentsListModal, setShowPaymentsListModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SimpleOrderPayment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'paid'>('all');
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastOrderElementRef = useCallback((node: HTMLTableRowElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasNext) {
        loadMoreOrders();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, pagination.hasNext]);

  const loadOrders = async (page: number = 1, reset: boolean = true, searchQuery: string = '') => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await SimpleOrdersApiService.getPaginated(page, 20, searchQuery);
      
      if (reset) {
        setOrders(response.data);
      } else {
        setOrders(prev => [...prev, ...response.data]);
      }
      
      setPagination(response.pagination);
      setGlobalStats(response.stats);
      setCurrentSearchTerm(searchQuery);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching simple orders:', err);
      setError(err.message || 'Error al cargar órdenes rápidas');
      toast.error('Error al cargar las órdenes rápidas');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreOrders = () => {
    if (!loadingMore && pagination.hasNext) {
      loadOrders(pagination.page + 1, false, currentSearchTerm);
    }
  };

  useEffect(() => {
    loadOrders(1, true, '');
  }, []);

  // Manejar búsqueda con debounce
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = window.setTimeout(() => {
      if (searchTerm !== currentSearchTerm) {
        loadOrders(1, true, searchTerm);
      }
    }, 400);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleOrderCreated = () => {
    loadOrders(1, true, searchTerm);
  };

  const handlePaymentCreated = (_payment: SimpleOrderPayment | number | any) => {
    loadOrders(1, true, searchTerm);
  };

  const handleAddPayment = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowPaymentModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowPaymentModal(false);
    setShowPaymentsListModal(false);
    setShowEditPaymentModal(false);
    setShowPrintModal(false);
    setSelectedOrderId(null);
    setSelectedPayment(null);
    setOpenDropdownId(null);
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };
  
  const handlePrintPending = () => {
    // Filter orders that have pending balance > 0
    const pendingOrders = orders.filter(o => o.balance && o.balance > 0);
    
    if (pendingOrders.length === 0) {
      toast.info('No hay órdenes rápidas pendientes por liquidar.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permite ventanas emergentes para imprimir la bitácora.');
      return;
    }

    const currentDate = formatDateMX(nowISO(), 'DD/MM/YYYY, h:mm A');
    printWindow.document.write(generateSimpleOrdersLogbookHtml(pendingOrders, currentDate));
    printWindow.document.close();
  };

  const getPaymentBadge = (order: SimpleOrder) => {
    if (order.balance <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Pagado
        </span>
      );
    } else if (order.totalPaid > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Pendiente ${order.balance.toFixed(2)}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Sin Abono
        </span>
      );
    }
  };

  const formatDateTime = (dateString: string) => {
    return formatDateMX(dateString, 'DD MMM YYYY, h:mm A');
  };

  // Filter only by status on the client-side, since search is already handled by backend
  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (filterStatus === 'pending' && order.balance <= 0) return false;
    if (filterStatus === 'paid' && order.balance > 0) return false;
    return true;
  });

  const totalIngresos = globalStats.totalRevenues;
  const totalPendientes = globalStats.totalPending;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes Rápidas</h1>
          <p className="text-gray-600 mt-2">Control de ingresos rápidos o ventas de mostrador</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={handlePrintPending}>
            <Printer size={16} />
            Imprimir Pendientes
          </Button>
          <Button className="flex items-center gap-2" onClick={openCreateModal}>
            <Plus size={16} />
            Nueva Orden Rápida
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <p className="text-red-800 text-sm font-medium">{error}</p>
          <Button onClick={() => loadOrders(1, true, searchTerm)} size="sm" variant="destructive">
            Reintentar
          </Button>
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Órdenes</p>
            <p className="text-xl font-bold text-gray-900">{globalStats.totalCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ingresos Totales Registrados</p>
            <p className="text-xl font-bold text-gray-900">${totalIngresos.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Saldo Pendiente Restante</p>
            <p className="text-xl font-bold text-gray-900">${totalPendientes.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-t-lg shadow p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por concepto, cliente o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filterStatus === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filterStatus === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filterStatus === 'paid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Liquidadas
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-b-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="py-3 px-4 font-semibold uppercase">ID</th>
                <th className="py-3 px-4 font-semibold uppercase w-44">Fecha</th>
                <th className="py-3 px-4 font-semibold uppercase max-w-[150px]">Concepto</th>
                <th className="py-3 px-4 font-semibold uppercase">Cliente</th>
                <th className="py-3 px-4 font-semibold uppercase">Empleado</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Total</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Pagado</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Estado</th>
                <th className="py-3 px-4 font-semibold uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {/* Inline Skeleton Rows for loading first page */}
              {loading && orders.length === 0 && (
                <>
                  {[...Array(5)].map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16 float-right"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16 float-right"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-6 bg-gray-200 rounded-full w-20 inline-block"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-8 bg-gray-200 rounded w-24 inline-block"></div></td>
                    </tr>
                  ))}
                </>
              )}

              {filteredOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No se encontraron órdenes rápidas.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order, index) => {
                const isLast = index === filteredOrders.length - 1;
                return (
                  <tr 
                    key={order.id} 
                    ref={isLast ? lastOrderElementRef : null} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium">#{order.id}</td>
                    <td className="py-3 px-4 text-gray-500 w-44">{formatDateTime(order.date)}</td>
                    <td className="py-3 px-4 text-gray-900 truncate max-w-[150px]" title={order.concept}>{order.concept}</td>
                    <td className="py-3 px-4 text-gray-500">
                      <div>{order.client_name || '-'}</div>
                      {order.client_phone && (
                        <div className="text-xs text-gray-400 font-normal">{order.client_phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{order.user?.username || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium text-right">${order.total.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-medium text-right ${order.balance > 0 && order.totalPaid > 0 ? 'text-orange-600' : order.balance <= 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      ${order.totalPaid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {getPaymentBadge(order)}
                    </td>
                    <td className="py-3 px-4 text-center relative">
                      {/* Botones completos en pantallas muy grandes */}
                      <div className="hidden 2xl:flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50"
                          title="Editar Orden"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 rounded text-gray-400 hover:text-purple-600 bg-gray-50 hover:bg-purple-50"
                          title="Imprimir Orden"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowPaymentsListModal(true);
                          }}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50"
                          title="Ver Historial de Pagos"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleAddPayment(order.id)}
                          disabled={order.balance <= 0}
                          className={`p-1.5 rounded ${order.balance <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-green-600 bg-gray-50 hover:bg-green-50'}`}
                          title="Agregar Pago"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Botón de tres puntos en pantallas medianas/pequeñas (como 1366px) */}
                      <div className="2xl:hidden flex justify-center">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === order.id ? null : order.id);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100"
                            title="Acciones"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {openDropdownId === order.id && (
                            <>
                              {/* Backdrop invisible para cerrar al hacer clic fuera */}
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-40 origin-top-right text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderId(order.id);
                                    setShowEditModal(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Pencil size={14} className="text-gray-400" />
                                  Editar Orden
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderId(order.id);
                                    setShowPrintModal(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Printer size={14} className="text-gray-400" />
                                  Imprimir Orden
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderId(order.id);
                                    setShowPaymentsListModal(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Eye size={14} className="text-gray-400" />
                                  Ver Pagos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddPayment(order.id);
                                    setOpenDropdownId(null);
                                  }}
                                  disabled={order.balance <= 0}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                    order.balance <= 0 
                                      ? 'text-gray-300 cursor-not-allowed' 
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <Plus size={14} className={order.balance <= 0 ? 'text-gray-200' : 'text-gray-400'} />
                                  Agregar Pago
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loadingMore && (
                <tr className="animate-pulse bg-gray-50">
                  <td colSpan={9} className="py-4 text-center text-gray-500 font-medium">
                    Cargando más órdenes...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* End of list message */}
      {!loading && !loadingMore && orders.length > 0 && (
        <div className="text-center text-xs text-gray-400 my-4">
          {searchTerm.trim()
            ? `Se encontraron ${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${searchTerm}"`
            : `Has visto todas las órdenes rápidas (${pagination.total})`}
        </div>
      )}

      {showCreateModal && (
        <CreateSimpleOrderModal
          isOpen={showCreateModal}
          onClose={closeModals}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {selectedOrderId && showEditModal && (
        <EditSimpleOrderModal
          isOpen={showEditModal}
          onClose={closeModals}
          onOrderUpdated={handleOrderCreated}
          order={orders.find(o => o.id === selectedOrderId) || null}
        />
      )}

      {selectedOrderId && showPaymentModal && (
        <CreatePaymentModal
          isOpen={showPaymentModal}
          onClose={closeModals}
          orderId={selectedOrderId}
          orderTotal={orders.find(o => o.id === selectedOrderId)?.total || 0}
          currentPayments={orders.find(o => o.id === selectedOrderId)?.totalPaid || 0}
          clientName={orders.find(o => o.id === selectedOrderId)?.concept || 'Orden Rápida'}
          onPaymentCreated={handlePaymentCreated}
          isSimpleOrder={true}
        />
      )}

      {selectedOrderId && showPaymentsListModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-40"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Pagos - Orden #{selectedOrderId}</h2>
              <button onClick={closeModals} className="text-gray-500 hover:text-gray-700">
                &times;
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {orders.find(o => o.id === selectedOrderId)?.payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay pagos registrados.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {orders.find(o => o.id === selectedOrderId)?.payments.map((payment: SimpleOrderPayment) => (
                    <div key={payment.id} className="bg-gray-50 rounded p-3 border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                          {payment.descripcion && (
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{payment.descripcion}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(payment.date || '')}</p>
                        <p className="text-xs text-gray-500 mt-1">Registrado por: <strong>{(payment as any).user_username || 'Sistema'}</strong></p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentsListModal(false);
                          setShowEditPaymentModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar Pago"
                      >
                        <Pencil size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPayment && selectedOrderId && showEditPaymentModal && (
        <EditPaymentModal
          isOpen={showEditPaymentModal}
          onClose={closeModals}
          payment={selectedPayment as any}
          orderTotal={orders.find(o => o.id === selectedOrderId)?.total || 0}
          currentPayments={(orders.find(o => o.id === selectedOrderId)?.totalPaid || 0) - (selectedPayment.amount || 0)}
          onPaymentUpdated={handlePaymentCreated}
          onPaymentDeleted={handlePaymentCreated}
          clientName={orders.find(o => o.id === selectedOrderId)?.concept || 'Orden Rápida'}
          isSimpleOrder={true}
        />
      )}

      {selectedOrderId && showPrintModal && (
        <SimpleOrderPrintPreviewModal
          isOpen={showPrintModal}
          onClose={closeModals}
          orderData={orders.find(o => o.id === selectedOrderId) || null}
        />
      )}

    </div>
  );
};

export default SimpleOrdersPage;
