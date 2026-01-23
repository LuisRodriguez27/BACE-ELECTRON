import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Eye, Loader2, Search, ShoppingCart } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OrderDetailsModal from '../orders/components/OrderDetailsModal';
import type { Order } from '../orders/types';
import { PaymentsApiService } from '../payments/PaymentsApiService';
import type { Payment } from '../payments/types';
import { SalesApiService } from './SalesApiService';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPayments, setOrderPayments] = useState<Record<number, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState(''); // Para saber qué término se está usando actualmente
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<number | null>(null);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastOrderElementRef = useCallback((node: HTMLDivElement) => {
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
      console.log(`🔍 Cargando órdenes - Página: ${page}, Límite: 10, Reset: ${reset}, Búsqueda: "${searchQuery}"`);
      
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await SalesApiService.findAllPaginated(page, 10, searchQuery);
      
      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Respuesta de API inválida:', response);
        throw new Error('Formato de respuesta inválido');
      }
      
      if (reset) {
        setOrders(response.data);
      } else {
        setOrders(prev => [...prev, ...response.data]);
      }
      
      setPagination(response.pagination);
      setCurrentSearchTerm(searchQuery);
      
      console.log(`✅ Órdenes cargadas: ${response.data.length} | Total en BD: ${response.pagination.total} | Página actual: ${response.pagination.page}/${response.pagination.totalPages} | Hay más: ${response.pagination.hasNext}`);
      
      // Cargar pagos para las nuevas órdenes
      const paymentsPromises = response.data.map(async (order) => {
        try {
          const payments = await PaymentsApiService.findByOrderId(order.id);
          return { orderId: order.id, payments };
        } catch (err) {
          console.error(`Error fetching payments for order ${order.id}:`, err);
          return { orderId: order.id, payments: [] };
        }
      });
      
      const paymentsResults = await Promise.all(paymentsPromises);
      const newPaymentsMap = paymentsResults.reduce((acc, { orderId, payments }) => {
        acc[orderId] = payments;
        return acc;
      }, {} as Record<number, Payment[]>);
      
      if (reset) {
        setOrderPayments(newPaymentsMap);
      } else {
        setOrderPayments(prev => ({ ...prev, ...newPaymentsMap }));
      }
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreOrders = () => {
    if (!loadingMore && pagination.hasNext) {
      console.log(`🔄 Scroll infinito detectado - Cargando página ${pagination.page + 1} con búsqueda: "${currentSearchTerm}"`);
      loadOrders(pagination.page + 1, false, currentSearchTerm);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Manejar búsqueda con debounce
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = window.setTimeout(() => {
      if (searchTerm !== currentSearchTerm) {
        console.log(`🔍 Realizando búsqueda: "${searchTerm}"`);
        loadOrders(1, true, searchTerm);
      }
    }, 500); // Debounce de 500ms

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'en proceso':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedOrderId(null);
  };

  // Funciones auxiliares para pagos
  const getOrderPayments = (orderId: number): Payment[] => {
    return orderPayments[orderId] || [];
  };

  const getTotalPaid = (orderId: number): number => {
    const payments = getOrderPayments(orderId);
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRemainingAmount = (order: Order): number => {
    const totalPaid = getTotalPaid(order.id);
    return order.total - totalPaid;
  };

  const getPaymentStatus = (order: Order): { status: 'paid' | 'partial' | 'pending'; icon: React.ReactNode; color: string; text: string } => {
    const totalPaid = getTotalPaid(order.id);
    const remaining = order.total - totalPaid;
    
    if (remaining <= 0) {
      return {
        status: 'paid',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-green-600',
        text: 'Pagado'
      };
    } else if (totalPaid > 0) {
      return {
        status: 'partial',
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'text-orange-600',
        text: 'Pago parcial'
      };
    } else {
      return {
        status: 'pending',
        icon: <Clock className="h-4 w-4" />,
        color: 'text-gray-500',
        text: 'Sin pagos'
      };
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Ordenes</h1>
          <p className="text-gray-600 mt-2">
            Consulta las órdenes finalizadas
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por ID, notas, cliente o teléfono, producto o plantilla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Órdenes ({pagination.total})
            {currentSearchTerm && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (buscando: "{currentSearchTerm}")
              </span>
            )}
          </h2>
        </div>
        <div className="p-6">
          {orders.length === 0 && !loading ? (
            <div className="text-center py-12">
              {currentSearchTerm ? (
                <>
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron órdenes</h3>
                  <p className="text-gray-500 mb-4">
                    No hay órdenes que coincidan con "<strong>{currentSearchTerm}</strong>"
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    size="sm"
                  >
                    Limpiar búsqueda
                  </Button>
                </>
              ) : (
                <>
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes para mostrar en el historial</h3>
                  <p className="text-gray-500 mb-4">
                    Crea tu primera orden desde la ventana 'Ordenes'
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {orders.map((order, index) => {
                const paymentStatus = getPaymentStatus(order);
                const totalPaid = getTotalPaid(order.id);
                const remaining = getRemainingAmount(order);
                const paymentsCount = getOrderPayments(order.id).length;
                
                return (
                <div 
                      key={order.id} 
                      ref={index === orders.length - 1 ? lastOrderElementRef : null}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Orden #{order.id}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                            Completada
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 ${paymentStatus.color}`}>
                            {paymentStatus.icon}
                            {paymentStatus.text}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Fecha: {formatDate(order.date)}</span>
                          </div>
                          
                          {order.estimated_delivery_date && (
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              <span>Entrega: {formatDate(order.estimated_delivery_date)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} />
                            <span className="font-semibold text-blue-600">
                              Total: ${order.total.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} />
                            <span className={`font-semibold ${paymentStatus.status === 'paid' ? 'text-green-600' : paymentStatus.status === 'partial' ? 'text-orange-600' : 'text-gray-500'}`}>
                              Pagado: ${totalPaid.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(order.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye size={14} />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>

                    {/* Descripcion de la orden */}
                    {order.description && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800">Descripcion:</span>
                    <p className="text-sm text-yellow-700 mt-1 line-clamp-2 break-words" title={order.description}>{order.description}</p>
                    </div>
                    )}
                  
                    {/* Notas de la orden */}
                    {order.notes && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800">Notas:</span>
                    <p className="text-sm text-yellow-700 mt-1 line-clamp-2 break-words" title={order.notes}>{order.notes}</p>
                    </div>
                    )}
                  
                  {/* Información adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    {order.client && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Cliente:</span>
                        <div className="text-sm text-gray-600">ID: {order.client_id}</div>
                        <p className="text-sm text-gray-600">{order.client.name}</p>
                        {order.client.phone && (
                          <p className="text-xs text-gray-500">{order.client.phone}</p>
                        )}
                      </div>
                    )}
                    
                    {order.user && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Creado por:</span>
                        <p className="text-sm text-gray-600">{order.user.username}</p>
                      </div>
                    )}
                    
                    {order.editedByUser && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Editado por:</span>
                        <p className="text-sm text-gray-600">{order.editedByUser.username}</p>
                      </div>
                    )}
                    
                    {/* Información de pagos */}
                    {paymentsCount > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Pagos:</span>
                        <p className="text-sm text-gray-600">
                          {paymentsCount} pago{paymentsCount !== 1 ? 's' : ''} registrado{paymentsCount !== 1 ? 's' : ''}
                        </p>
                        {remaining > 0 && (
                          <p className="text-xs text-orange-600">
                            Pendiente: ${remaining.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {order.orderProducts && order.orderProducts.length > 0 && (
                      <div className={paymentsCount > 0 ? "" : "md:col-span-2"}>
                        <span className="text-sm font-medium text-gray-700">Productos:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {order.orderProducts.map((op, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                              {op.product_name} (x{op.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
            
            {/* Loading indicator para scroll infinito */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando más órdenes...</span>
              </div>
            )}
            
            {/* Mensaje cuando se han cargado todas las órdenes */}
            {!loadingMore && !pagination.hasNext && orders.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {currentSearchTerm 
                    ? `Se encontraron ${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${currentSearchTerm}"`
                    : `Has visto todas las órdenes (${pagination.total})`
                  }
                </p>
              </div>
            )}
          </>
          )}
        </div>
      </div>

      {/* Modals */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={closeModal}
        orderId={selectedOrderId}
        // No pasamos onOrderUpdated para deshabilitar edición en historial
      />

    </div>
  );
};

export default OrdersPage;
