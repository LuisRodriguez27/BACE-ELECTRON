import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard, DollarSign, Calendar, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentsApiService } from './PaymentsApiService';
import { OrdersApiService } from '../orders/OrdersApiService';
import type { Payment } from './types';
import type { Order } from '../orders/types';

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersData = await OrdersApiService.findAll();
        setOrders(ordersData);
        
        // Si hay órdenes, cargar pagos de la primera orden por defecto
        if (ordersData.length > 0) {
          const firstOrderId = ordersData[0].id;
          setSelectedOrderId(firstOrderId);
          await fetchPaymentsByOrder(firstOrderId);
        }
        
        console.log('Órdenes cargadas:', ordersData);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Error al cargar órdenes');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const fetchPaymentsByOrder = async (orderId: number) => {
    try {
      const paymentsData = await PaymentsApiService.findByOrderId(orderId);
      setPayments(paymentsData);
      console.log('Pagos cargados para orden:', orderId, paymentsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Error al cargar pagos');
    }
  };

  const handleOrderChange = (orderId: number) => {
    setSelectedOrderId(orderId);
    fetchPaymentsByOrder(orderId);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalPayments = () => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getSelectedOrder = () => {
    return orders.find(order => order.id === selectedOrderId);
  };

  const getRemainingAmount = () => {
    const selectedOrder = getSelectedOrder();
    if (!selectedOrder) return 0;
    return selectedOrder.total - getTotalPayments();
  };

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pagos</h1>
          <p className="text-gray-600 mt-2">
            Administra los pagos de las órdenes y consulta el historial de pagos
          </p>
        </div>
        <Button className="flex items-center gap-2" disabled={!selectedOrderId}>
          <Plus size={16} />
          Nuevo Pago
        </Button>
      </div>

      {/* Selector de orden y filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Orden:
            </label>
            <select
              value={selectedOrderId || ''}
              onChange={(e) => handleOrderChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccione una orden...</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Orden #{order.id} - {order.client?.name} - ${order.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar pagos..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de pagos */}
      {selectedOrderId && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Total Orden</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ${getSelectedOrder()?.total.toFixed(2) || '0.00'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Total Pagado</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${getTotalPayments().toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Pendiente</h3>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ${getRemainingAmount().toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Num. Pagos</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {payments.length}
            </p>
          </div>
        </div>
      )}

      {/* Lista de pagos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pagos {selectedOrderId ? `de la Orden #${selectedOrderId}` : ''} ({payments.length})
          </h2>
        </div>
        <div className="p-6">
          {!selectedOrderId ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una orden</h3>
              <p className="text-gray-500">
                Elige una orden del selector para ver sus pagos
              </p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
              <p className="text-gray-500 mb-4">
                Esta orden aún no tiene pagos registrados
              </p>
              <Button className="flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Registrar Primer Pago
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">Pago #{payment.id}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
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
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Ver Recibo
                      </Button>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                  
                  {payment.descripcion && (
                    <div className="bg-gray-50 rounded p-3">
                      <span className="text-sm font-medium text-gray-700">Descripción:</span>
                      <p className="text-sm text-gray-600 mt-1">{payment.descripcion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
