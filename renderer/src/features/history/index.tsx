import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Filter, Search, ShoppingCart, Eye, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Order } from '../orders/types';
import type { Payment } from '../payments/types';
import { SalesApiService } from './SalesApiService';
import { PaymentsApiService } from '../payments/PaymentsApiService';
import OrderDetailsModal from '../orders/components/OrderDetailsModal';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPayments, setOrderPayments] = useState<Record<number, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await SalesApiService.findAll();
        setOrders(data);
        
        // Cargar pagos para cada orden
        const paymentsPromises = data.map(async (order) => {
          try {
            const payments = await PaymentsApiService.findByOrderId(order.id);
            return { orderId: order.id, payments };
          } catch (err) {
            console.error(`Error fetching payments for order ${order.id}:`, err);
            return { orderId: order.id, payments: [] };
          }
        });
        
        const paymentsResults = await Promise.all(paymentsPromises);
        const paymentsMap = paymentsResults.reduce((acc, { orderId, payments }) => {
          acc[orderId] = payments;
          return acc;
        }, {} as Record<number, Payment[]>);
        
        setOrderPayments(paymentsMap);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Error al cargar órdenes');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

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
                placeholder="Buscar órdenes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </Button>
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Órdenes ({orders.length})
          </h2>
        </div>
        <div className="p-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes para mostrar en el historial</h3>
              <p className="text-gray-500 mb-4">
                Crea tu primera orden desde la ventana 'Ordenes'
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const paymentStatus = getPaymentStatus(order);
                const totalPaid = getTotalPaid(order.id);
                const remaining = getRemainingAmount(order);
                const paymentsCount = getOrderPayments(order.id).length;
                
                return (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
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
                  
                  {/* Información adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    {order.client && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Cliente:</span>
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
