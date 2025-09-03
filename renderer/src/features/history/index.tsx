import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Filter, Search, ShoppingCart } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Order } from '../orders/types';
import { SalesApiService } from './SalesApiService';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await SalesApiService.findAll();
        setOrders(data);
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
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">Orden #{order.id}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          Completada
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
                          <span className="font-semibold text-green-600">
                            ${order.total.toFixed(2)} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                      <Button variant="outline" size="sm">
                        Editar
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
                    
                    {order.orderProducts && order.orderProducts.length > 0 && (
                      <div className="md:col-span-2">
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      

    </div>
  );
};

export default OrdersPage;
