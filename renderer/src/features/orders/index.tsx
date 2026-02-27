import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Edit3, Eye, Plus, Printer, Search, ShoppingCart } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PaymentsApiService } from '../payments/PaymentsApiService';
import CreatePaymentModal from '../payments/components/CreatePaymentModal';
import type { Payment } from '../payments/types';
import CreateOrderModal from './components/CreateOrderModal';
import OrderDetailsModal from './components/OrderDetailsModal';
// import OrderEditModal from './components/OrderEditModal'; // Ya no se usa, ahora CreateOrderModal maneja todo
import { OrdersApiService } from './OrdersApiService';
import type { Order } from './types';
import { getOrderItemDisplayName } from './types';
import { usePermissions } from '@/hooks/use-permissions';
import ClientColorIndicator from '../clients/components/ClientColorIndicator';
import type { ClientColor } from '../clients/types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPayments, setOrderPayments] = useState<Record<number, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { checkPermission } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await OrdersApiService.findAll();
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

  const handlePrintLogbook = async () => {
    try {
      const ordersToPrint = await OrdersApiService.findPendingForLogbook();
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor permite ventanas emergentes para imprimir');
        return;
      }

      const currentDate = new Date().toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bitácora de Trabajo - ${currentDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
            p.date { text-align: center; margin-top: 0; margin-bottom: 15px; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; }
            th { background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
            .center { text-align: center; }
            .check-col { width: 40px; text-align: center; }
            .client-subcol { width: 35px; }
            
            /* Background Colors for Status */
            .bg-diseno { background-color: #ffd1dc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Rosa Palo */
            .bg-produccion { background-color: #ffff99 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Amarillo Canario */
            .bg-entrega { background-color: #90ee90 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Verde Manzana/Claro */
            
            /* Status Checks */
            .checkmark { font-size: 14px; font-weight: bold; }
            
            /* Print optimizations */
            @media print {
              @page { size: landscape; margin: 0.5cm; }
              body { margin: 0; }
              tr { break-inside: avoid; }
              td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>BITÁCORA DE TRABAJO - BACE</h1>
          <p class="date">${currentDate}</p>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 50px;">Folio</th>
                <th rowspan="2" style="width: 70px;">Fecha Rec.</th>
                <th rowspan="2" style="width: 150px;">Cliente</th>
                <th rowspan="2">Descripción</th>
                <th colspan="3">Estatus</th>
                <th colspan="2">Cliente</th>
                <th rowspan="2" style="width: 70px;">Fecha Ent.</th>
              </tr>
              <tr>
                <th class="check-col">Diseño</th>
                <th class="check-col">Prod.</th>
                <th class="check-col">Entrega</th>
                <th class="client-subcol">MOS</th>
                <th class="client-subcol">MAQ</th>
              </tr>
            </thead>
            <tbody>
              ${ordersToPrint.length === 0 ? '<tr><td colspan="10" class="center">No hay órdenes pendientes</td></tr>' : ''}
              ${ordersToPrint.map(order => {
                const dateR = dayjs(order.date).format('DD/MM/YYYY');
                
                let dateEObj = order.estimated_delivery_date ? dayjs(order.estimated_delivery_date) : null;
                if (dateEObj && dateEObj.utc().hour() === 0 && dateEObj.utc().minute() === 0) {
                   dateEObj = dateEObj.add(1, 'day');
                }
                const dateE = dateEObj ? dateEObj.format('DD/MM/YYYY') : '-';
                
                // Mapeo de estados a columnas
                // Diseño -> Columna Diseño
                const isDiseño = order.status === 'Diseño';
                // Produccion -> Columna Prod.
                const isProduccion = order.status === 'Produccion';
                // Entrega -> Columna Entrega
                const isEntrega = order.status === 'Entrega';

                const isMostrador = order.responsable === 'Mostrador';
                const isMaquila = order.responsable === 'Maquila';

                return `
                  <tr>
                    <td class="center"><strong>${order.id}</strong></td>
                    <td class="center">${dateR}</td>
                    <td>${order.client_name || order.client?.name || 'Sin Cliente'}</td>
                    <td>${order.description || order.notes || ''}</td>
                    <td class="center ${isDiseño ? 'bg-diseno' : ''}"></td>
                    <td class="center ${isProduccion ? 'bg-produccion' : ''}"></td>
                    <td class="center ${isEntrega ? 'bg-entrega' : ''}"></td>
                    <td class="center">${isMostrador ? '<span class="checkmark">✓</span>' : ''}</td>
                    <td class="center">${isMaquila ? '<span class="checkmark">✓</span>' : ''}</td>
                    <td class="center">${dateE}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Error imprimiendo bitácora:', err);
    }
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
  };

  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  const handleEditOrder = (orderId: number) => {
    if (!checkPermission("Editar Órdenes")) {
      return;
    }
    setSelectedOrderId(orderId);
    setShowEditModal(true);
  };

  const handleAddPayment = (orderId: number) => {
    if (!checkPermission("Registrar Pagos")) {
      return;
    }
    setSelectedOrderId(orderId);
    setShowPaymentModal(true);
  };

  const openCreateModal = () => {
    if (!checkPermission("Crear Órdenes")) {
      return;
    }
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowDetailsModal(false);
    setShowEditModal(false);
    setShowPaymentModal(false);
    setSelectedOrderId(null);
  }

  const formatDate = (dateString: string) => {
    let date = dayjs(dateString);
    // Si la hora es exactamente medianoche en UTC, sumar un día
    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }
    return date.tz('America/Mexico_City').format('D MMM YYYY');
  };

  const formatDateTime = (dateString: string) => {
    let date = dayjs(dateString);
    // Si la hora es exactamente medianoche en UTC, sumar un día
    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }
    return date.tz('America/Mexico_City').format('D MMM YYYY, h:mm A');
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'revision':
        return 'bg-yellow-100 text-yellow-800';
      case 'diseño':
        return 'bg-purple-100 text-purple-800';
      case 'produccion':
        return 'bg-blue-100 text-blue-800';
      case 'entrega':
        return 'bg-cyan-100 text-cyan-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'revision':
        return 'Revisión';
      case 'diseño':
        return 'Diseño';
      case 'produccion':
        return 'Producción';
      case 'entrega':
        return 'Entrega';
      case 'completado':
        return 'Completado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getResponsableColor = (responsable: string) => {
    switch (responsable.toLowerCase()) {
      case 'mostrador':
        return 'bg-green-100 text-green-800';
      case 'maquila':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponsableText = (responsable: string) => {
    switch (responsable.toLowerCase()) {
      case 'mostrador':
        return 'Mostrador';
      case 'maquila':
        return 'Maquila';
      default:
        return responsable;
    }
  };

  const { user } = useAuthStore();

  // Función de filtrado
  const filteredOrders = orders.filter(order => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();

    // Buscar por ID (número exacto o parcial)
    const idMatch = order.id.toString().includes(searchLower);

    // Buscar por notas (si existen)
    const notesMatch = order.notes && order.notes.toLowerCase().includes(searchLower);

    const descriptionMatch = order.description && order.description.toLowerCase().includes(searchLower);

    // Buscar por nombre del cliente
    const clientNameMatch = order.client && order.client.name.toLowerCase().includes(searchLower);

    // Buscar por teléfono del cliente
    const clientPhoneMatch = order.client && order.client.phone && order.client.phone.includes(searchLower);

    // Buscar por productos
    const productMatch = order.orderProducts && order.orderProducts.some(op => {
      const name = getOrderItemDisplayName(op).toLowerCase();
      // También buscar en la descripción del producto o plantilla
      const desc = (op.product_description || op.template_description || '').toLowerCase();
      return name.includes(searchLower) || desc.includes(searchLower);
    });

    return idMatch || notesMatch || descriptionMatch || clientNameMatch || clientPhoneMatch || productMatch;
  });

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

  const handlePaymentCreated = (newPayment: Payment) => {
    // Actualizar los pagos de la orden específica
    setOrderPayments(prev => ({
      ...prev,
      [newPayment.order_id]: [...(prev[newPayment.order_id] || []), newPayment]
    }));
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Órdenes</h1>
          <p className="text-gray-600 mt-2">
            Administra las órdenes de producción y su estado
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700"
            onClick={handlePrintLogbook}
            title="Imprimir Bitácora de Trabajo"
          >
            <Printer size={16} />
            Bitácora
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Nueva Orden
          </Button>
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
            Órdenes ({filteredOrders.length}{orders.length !== filteredOrders.length ? ` de ${orders.length}` : ''})
          </h2>
        </div>
        <div className="p-6">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primera orden de producción
              </p>
              <Button
                className="flex items-center gap-2 mx-auto"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Crear Primera Orden
              </Button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron órdenes</h3>
              <p className="text-gray-500 mb-4">
                No hay órdenes que coincidan con tu búsqueda: "{searchTerm}"
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchTerm('')}
                className="mx-auto"
              >
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
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
                            {getStatusText(order.status)}
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 ${paymentStatus.color}`}>
                            {paymentStatus.icon}
                            {paymentStatus.text}
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${getResponsableColor(order.responsable || '')}`}>
                              {getResponsableText(order.responsable || '')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Fecha: {formatDateTime(order.date)}</span>
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
                          onClick={() => handleAddPayment(order.id)}
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={getRemainingAmount(order) <= 0}
                        >
                          <DollarSign size={14} />
                          Agregar Pago
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order.id)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit3 size={14} />
                          Edición
                        </Button>
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

                    {/* Descripción de la orden */}
                    {order.description && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Descripción:</span>
                        <p className="text-sm text-blue-700 mt-1 line-clamp-2 break-words" title={order.description}>{order.description}</p>
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
                          <div className="flex items-center gap-2 mt-1">
                            {order.client.phone && (
                              <p className="text-xs text-gray-500">{order.client.phone}</p>
                            )}
                            {order.client.color && (
                              <ClientColorIndicator color={order.client.color as ClientColor} size="sm" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* {order.user && (
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
                      )} */}

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
                                {getOrderItemDisplayName(op)} (x{op.quantity})
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
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onOrderCreated={handleOrderCreated}
        currentUserId={user?.id!}
      />

      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={closeModals}
        orderId={selectedOrderId}
        onOrderUpdated={handleOrderUpdated}
        onEditClick={(orderId) => {
          // No limpiar el selectedOrderId, solo cambiar los estados de los modales
          setShowDetailsModal(false);
          // Asegurarse de que el orderId esté configurado antes de abrir el modal de edición
          setSelectedOrderId(orderId);
          // Usar setTimeout para asegurar que React actualice el estado antes de abrir el nuevo modal
          setTimeout(() => {
            setShowEditModal(true);
          }, 100); // Aumentar el delay a 100ms
        }}
      />

      {/* Modal de edición - ahora usa CreateOrderModal */}
      <CreateOrderModal
        isOpen={showEditModal}
        onClose={closeModals}
        onOrderCreated={handleOrderCreated}
        onOrderUpdated={handleOrderUpdated}
        currentUserId={user?.id!}
        orderId={selectedOrderId}
      />

      {selectedOrderId && (
        <CreatePaymentModal
          isOpen={showPaymentModal}
          onClose={closeModals}
          orderId={selectedOrderId}
          orderTotal={orders.find(o => o.id === selectedOrderId)?.total || 0}
          currentPayments={getTotalPaid(selectedOrderId)}
          clientName={orders.find(o => o.id === selectedOrderId)?.client?.name || 'Cliente'}
          onPaymentCreated={handlePaymentCreated}
        />
      )}

    </div>
  );
};

export default OrdersPage;
