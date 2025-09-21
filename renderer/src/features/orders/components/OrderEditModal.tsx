import React, { useState, useEffect } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { X, Edit3, Calendar, AlertCircle, CheckCircle2, Clock, XCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { OrdersApiService } from '../OrdersApiService';
import { extractErrorMessage } from '@/utils/errorHandling';
import type { Order, OrderStatusType } from '../types';

interface OrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onOrderUpdated: (order: Order) => void;
}

const OrderEditModal: React.FC<OrderEditModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated
}) => {
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: 'pendiente' as OrderStatusType,
    estimated_delivery_date: ''
  });

  // Cargar orden al abrir el modal
  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderData();
    }
  }, [isOpen, orderId]);

  const loadOrderData = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const orderData = await OrdersApiService.findById(orderId);
      setOrder(orderData);
      
      // Inicializar formulario con datos de la orden
      setFormData({
        status: orderData.status,
        estimated_delivery_date: orderData.estimated_delivery_date || ''
      });
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Error al cargar los datos de la orden');
      toast.error('Error al cargar los datos de la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order || !user) {
      toast.error('Error: No se puede actualizar la orden');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const updateData = {
        status: formData.status,
        estimated_delivery_date: formData.estimated_delivery_date || undefined,
        edited_by: user.id // ← SIEMPRE pasar el ID del usuario loggeado
      };
      
      const updatedOrder = await OrdersApiService.update(order.id, updateData);
      
      toast.success('Orden actualizada exitosamente');
      onOrderUpdated(updatedOrder);
      handleClose();
    } catch (err) {
      console.error('Error updating order:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error('Error al actualizar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOrder(null);
    setFormData({
      status: 'pendiente',
      estimated_delivery_date: ''
    });
    setError(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusInfo = (status: OrderStatusType) => {
    switch (status) {
      case 'pendiente':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: <Clock className="h-4 w-4" />,
          text: 'Pendiente'
        };
      case 'en proceso':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'En Proceso'
        };
      case 'completado':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: 'Completada'
        };
      case 'cancelado':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: <XCircle className="h-4 w-4" />,
          text: 'Cancelada'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: <AlertCircle className="h-4 w-4" />,
          text: status
        };
    }
  };

  const statusOptions = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en proceso', label: 'En Proceso' },
    { value: 'completado', label: 'Completada' },
    { value: 'cancelado', label: 'Cancelada' }
  ] as const;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Edit3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Editar Orden
              </h2>
              <p className="text-sm text-gray-500">
                {order ? `Orden #${order.id}` : 'Cargando...'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!user && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <p className="text-yellow-800 text-sm">No hay usuario autenticado. No se puede editar la orden.</p>
            </div>
          )}

          {loading && !order && (
            <div className="flex items-center justify-center py-8">
              <Loader className="animate-spin h-6 w-6 text-blue-600 mr-3" />
              <span className="text-gray-600">Cargando datos de la orden...</span>
            </div>
          )}

          {error && !order && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
              <Button 
                onClick={loadOrderData} 
                className="mt-3"
                size="sm"
              >
                Reintentar
              </Button>
            </div>
          )}

          {order && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Información de la orden (solo lectura) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Información de la Orden</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Número de orden:</span>
                    <p className="font-medium text-gray-900">#{order.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente:</span>
                    <p className="font-medium text-gray-900">
                      {order.client?.name || 'Sin cliente'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Fecha de la orden:</span>
                    <p className="font-medium text-gray-900">{formatDate(order.date)}</p>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div>
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2 block">
                  Estado *
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    status: e.target.value as OrderStatusType 
                  }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {/* Vista previa del estado seleccionado */}
                <div className="mt-2">
                  <span className="text-xs text-gray-500">Vista previa:</span>
                  <div className={`inline-flex items-center gap-2 ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusInfo(formData.status).bgColor} ${getStatusInfo(formData.status).color}`}>
                    {getStatusInfo(formData.status).icon}
                    {getStatusInfo(formData.status).text}
                  </div>
                </div>
              </div>

              {/* Fecha estimada de entrega */}
              <div>
                <Label htmlFor="estimated_delivery_date" className="text-sm font-medium text-gray-700">
                  Fecha estimada de entrega
                </Label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="estimated_delivery_date"
                    type="date"
                    value={formData.estimated_delivery_date}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimated_delivery_date: e.target.value 
                    }))}
                    className="pl-10"
                    min={new Date().toISOString().split('T')[0]} // No permitir fechas pasadas
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.estimated_delivery_date 
                    ? `Fecha seleccionada: ${formatDate(formData.estimated_delivery_date)}`
                    : 'Opcional - Deja vacío si no hay fecha estimada'
                  }
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !user}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin" size={16} />}
                  Actualizar Orden
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderEditModal;