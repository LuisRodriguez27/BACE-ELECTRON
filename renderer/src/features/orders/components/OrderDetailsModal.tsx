import { Button, Input, Label } from '@/components/ui';
import { extractErrorMessage } from '@/utils/errorHandling';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  History,
  Info,
  Layers,
  Loader,
  Package,
  Phone,
  Receipt,
  User,
  X,
  XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OrdersApiService } from '../OrdersApiService';
import { getOrderItemDisplayName, getOrderItemType, type Order, type OrderProduct } from '../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  onOrderUpdated?: (order: Order) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: '',
    estimated_delivery_date: '',
    notes: ''
  });

  // Cargar datos de la orden al abrir el modal
  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetails();
    }
  }, [isOpen, orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Cargar orden y productos en paralelo
      const [orderData, productsData] = await Promise.all([
        OrdersApiService.findById(orderId),
        OrdersApiService.getOrderProducts(orderId)
      ]);
      
      setOrder(orderData);
      setOrderProducts(productsData);
      
      // Inicializar datos del formulario de edición
      setEditFormData({
        status: orderData.status,
        estimated_delivery_date: orderData.estimated_delivery_date || '',
        notes: orderData.notes || ''
      });
    } catch (err) {
      console.error('Error loading order details:', err);
      setError('Error al cargar los detalles de la orden');
      toast.error('Error al cargar los detalles de la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      const updateData = {
        status: editFormData.status as any,
        estimated_delivery_date: editFormData.estimated_delivery_date || undefined,
        notes: editFormData.notes || undefined
      };
      
      const updatedOrder = await OrdersApiService.update(order.id, updateData);
      setOrder(updatedOrder);
      setIsEditing(false);
      
      if (onOrderUpdated) {
        onOrderUpdated(updatedOrder);
      }
      
      toast.success('Orden actualizada exitosamente');
    } catch (err) {
      console.error('Error updating order:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error('Error al actualizar la orden');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (!order) return;
    
    setEditFormData({
      status: order.status,
      estimated_delivery_date: order.estimated_delivery_date || '',
      notes: order.notes || ''
    });
    setIsEditing(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'en proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return <Clock className="h-4 w-4" />;
      case 'completado':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4" />;
      case 'en proceso':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'Pendiente';
      case 'completado':
        return 'Completada';
      case 'cancelado':
        return 'Cancelada';
      case 'en proceso':
        return 'En Proceso';
      default:
        return status;
    }
  };

  const calculateSubtotal = () => {
    return orderProducts.reduce((sum, product) => sum + product.total_price, 0);
  };

  const handleClose = () => {
    setOrder(null);
    setOrderProducts([]);
    setIsEditing(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {order ? `Orden #${order.id}` : 'Detalles de la Orden'}
              </h2>
              <p className="text-sm text-gray-500">
                {loading ? 'Cargando detalles...' : onOrderUpdated ? 'Información completa de la orden' : 'Vista de solo lectura - Historial'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {order && !isEditing && onOrderUpdated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 size={16} />
                Editar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && !order && (
            <div className="flex items-center justify-center p-8">
              <Loader className="animate-spin h-8 w-8 text-blue-600" />
              <span className="ml-3 text-gray-600">Cargando detalles de la orden...</span>
            </div>
          )}

          {error && !order && (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <Button 
                onClick={loadOrderDetails} 
                className="mt-3"
                size="sm"
              >
                Reintentar
              </Button>
            </div>
          )}

          {order && (
            <div className="space-y-6">
              {/* Error de edición */}
              {error && isEditing && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Información básica de la orden */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Información principal */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Estado y fechas */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Información General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Estado</Label>
                        {isEditing ? (
                          <select
                            value={editFormData.status}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en proceso">En Proceso</option>
                            <option value="completado">Completado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        ) : (
                          <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {getStatusText(order.status)}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Fecha de la orden</Label>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {formatDate(order.date)}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Fecha estimada de entrega</Label>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editFormData.estimated_delivery_date}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, estimated_delivery_date: e.target.value }))}
                            className="mt-1"
                          />
                        ) : (
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                            <CalendarDays className="h-4 w-4" />
                            {order.estimated_delivery_date 
                              ? formatDate(order.estimated_delivery_date)
                              : 'No definida'
                            }
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Total</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-lg font-semibold text-green-600">
                            ${order.total.toFixed(2)} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notas
                    </h3>
                    {isEditing ? (
                      <textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Notas adicionales sobre la orden..."
                      />
                    ) : (
                      <div className="text-sm text-gray-600">
                        {order.notes || (
                          <span className="text-gray-400 italic">Sin notas adicionales</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Información del cliente */}
                <div className="space-y-6">
                  {order.client && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Cliente
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Nombre</Label>
                          <p className="text-sm text-gray-900 font-medium">{order.client.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p className="text-sm text-gray-600">{order.client.phone}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información de usuario */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Historial
                    </h3>
                    <div className="space-y-3 text-sm">
                      {order.user && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Creado por</Label>
                          <p className="text-gray-600">{order.user.username}</p>
                        </div>
                      )}
                      {order.editedByUser && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Última edición por</Label>
                          <p className="text-gray-600">{order.editedByUser.username}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de productos */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos y Plantillas
                    <span className="text-sm font-normal text-gray-500">
                      ({orderProducts.length} items)
                    </span>
                  </h3>
                </div>
                <div className="p-6">
                  {orderProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">No hay productos en esta orden</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderProducts.map((product, index) => (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                                {index + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900">
                                    {getOrderItemDisplayName(product)}
                                  </h4>
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    getOrderItemType(product) === 'product' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {getOrderItemType(product) === 'product' ? (
                                      <><Package className="h-3 w-3 inline mr-1" />Producto</>
                                    ) : (
                                      <><Layers className="h-3 w-3 inline mr-1" />Plantilla</>
                                    )}
                                  </span>
                                </div>
                                {product.serial_number && (
                                  <p className="text-xs text-gray-500">SN: {product.serial_number}</p>
                                )}
                                {product.product_description && (
                                  <p className="text-sm text-gray-600 mt-1">{product.product_description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                ${product.total_price.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                ${product.unit_price.toFixed(2)} × {product.quantity}
                              </div>
                            </div>
                          </div>

                          {/* Información adicional para plantillas */}
                          {getOrderItemType(product) === 'template' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-sm">
                              {product.template_width && product.template_height && (
                                <div>
                                  <span className="font-medium text-gray-600">Dimensiones:</span>
                                  <p className="text-gray-700">{product.template_width} × {product.template_height} cm</p>
                                </div>
                              )}
                              {product.template_colors && (
                                <div>
                                  <span className="font-medium text-gray-600">Colores:</span>
                                  <p className="text-gray-700">{product.template_colors}</p>
                                </div>
                              )}
                              {product.template_position && (
                                <div>
                                  <span className="font-medium text-gray-600">Posición:</span>
                                  <p className="text-gray-700">{product.template_position}</p>
                                </div>
                              )}
                              {product.template_texts && (
                                <div className="md:col-span-3">
                                  <span className="font-medium text-gray-600">Textos:</span>
                                  <p className="text-gray-700">{product.template_texts}</p>
                                </div>
                              )}
                              {product.template_description && (
                                <div className="md:col-span-3">
                                  <span className="font-medium text-gray-600">Descripción:</span>
                                  <p className="text-gray-700">{product.template_description}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen de totales */}
                {orderProducts.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Subtotal:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ${calculateSubtotal().toFixed(2)} MXN
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-green-600">
                        ${order.total.toFixed(2)} MXN
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Información de pagos (si existe) */}
              {order.payments && order.payments.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pagos Registrados
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {order.payments.map((payment, index) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <span className="font-medium text-green-800">Pago #{index + 1}</span>
                            {payment.date && (
                              <p className="text-sm text-green-600">
                                {formatDateTime(payment.date)}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-green-700">
                            ${payment.amount.toFixed(2)} MXN
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        {order && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader className="animate-spin" size={16} />}
                  Guardar Cambios
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsModal;