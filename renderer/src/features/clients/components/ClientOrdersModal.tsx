import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Calendar, DollarSign, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrdersApiService } from '@/features/orders/OrdersApiService';
import { toast } from 'sonner';
import type { Order } from '@/features/orders/types';
import type { Client } from '../types';
import { formatDateMX, formatDateOnlyMX } from '@/utils/dateUtils';

interface ClientOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onViewOrder?: (orderId: number) => void;
}

const ClientOrdersModal: React.FC<ClientOrdersModalProps> = ({ 
  isOpen, 
  onClose, 
  client,
  onViewOrder
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client?.id) {
      fetchClientOrders(client.id);
    }
  }, [isOpen, client?.id]);

  const fetchClientOrders = async (clientId: number) => {
    try {
      setLoading(true);
      setError(null);
      const clientOrders = await OrdersApiService.findByClientId(clientId);
      setOrders(clientOrders);
    } catch (err) {
      console.error('Error fetching client orders:', err);
      setError('Error al cargar las órdenes del cliente');
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'en proceso': 'bg-blue-100 text-blue-800', 
      'completado': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      'pendiente': 'Pendiente',
      'en proceso': 'En Proceso',
      'completado': 'Completado', 
      'cancelado': 'Cancelado'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  // Para la fecha de creación de la orden (tiene hora significativa)
  const formatDateTime = (dateString: string) => {
    return formatDateMX(dateString, 'D MMM YYYY, h:mm A');
  };

  // Para fechas de entrega (guardadas como UTC midnight, no convertir timezone)
  const formatDateOnly = (dateString: string) => {
    return formatDateOnlyMX(dateString, 'D MMM YYYY');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (!isOpen || !client) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Órdenes de {client.name}
              </h2>
              <p className="text-gray-500 text-sm">
                Historial completo de órdenes del cliente
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando órdenes...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">{error}</p>
                <Button 
                  onClick={() => client.id && fetchClientOrders(client.id)}
                  className="mt-2"
                  size="sm"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay órdenes
              </h3>
              <p className="text-gray-500">
                {client.name} aún no tiene órdenes registradas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'} encontradas
                </h3>
                <div className="text-sm text-gray-500">
                  Total: {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
                </div>
              </div>

              <div className="grid gap-4">
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <Package size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Orden #{order.id}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Creada el {formatDateTime(order.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        {onViewOrder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewOrder(order.id)}
                            className="p-2 h-8 w-8"
                          >
                            <Eye size={14} />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      
                      {order.estimated_delivery_date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="text-gray-600">
                            Entrega: {formatDateOnly(order.estimated_delivery_date)}
                          </span>
                        </div>
                      )}

                      {order.orderProducts && order.orderProducts.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-400" />
                          <span className="text-gray-600">
                            {order.orderProducts.length} {order.orderProducts.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <strong>Notas:</strong> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientOrdersModal;