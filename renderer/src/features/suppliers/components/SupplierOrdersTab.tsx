import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye, Edit3, Trash2, Calendar, FileText, User } from 'lucide-react';
import { SuppliersApiService } from '../SuppliersApiService';
import type { Supplier, SupplierOrder } from '../types';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { formatDateMX } from '@/utils/dateUtils';
import { useNavigate } from '@tanstack/react-router';
import { calculateOrderTotalPieces } from '../utils';

// Import modals
import CreateSupplierOrderModal from './CreateSupplierOrderModal';
import EditSupplierOrderModal from './EditSupplierOrderModal';
import DeleteSupplierOrderModal from './DeleteSupplierOrderModal';
import SupplierOrderDetailsModal from './SupplierOrderDetailsModal';

interface SupplierOrdersTabProps {
  suppliers: Supplier[];
  initialOrderId?: number | null;
}

const getProgressStyles = (status: string | null) => {
  const s = String(status).toLowerCase();
  if (s === 'cancelado') {
    return {
      percent: 0,
      colorClass: 'bg-gray-400',
      badgeClass: 'bg-gray-50 text-gray-500 border-gray-200',
      label: 'Cancelado'
    };
  }
  if (s === 'pagado') {
    return {
      percent: 100,
      colorClass: 'bg-green-500',
      badgeClass: 'bg-green-50 text-green-700 border-green-200',
      label: 'Pagado'
    };
  }
  // Default to 'pendiente'
  return {
    percent: 50,
    colorClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Pendiente'
  };
};

const SupplierOrdersTab: React.FC<SupplierOrdersTabProps> = ({ suppliers, initialOrderId }) => {
  const navigate = useNavigate();
  const { checkPermission } = usePermissions();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (initialOrderId) {
      setShowCreateModal(true);
    }
  }, [initialOrderId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await SuppliersApiService.findAllOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching supplier orders:', err);
      toast.error('Error al cargar historial de órdenes de proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCreated = (newOrder: SupplierOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    toast.success('Orden de proveedor registrada exitosamente');
  };

  const handleOrderUpdated = (updatedOrder: SupplierOrder) => {
    setOrders(prev =>
      prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    toast.success('Orden de proveedor actualizada exitosamente');
  };

  const handleOrderDeleted = (orderId: number) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    toast.success('Orden de proveedor eliminada del sistema');
  };

  const openCreateModal = () => {
    if (!checkPermission('Crear Orden Mayorista')) return;
    setShowCreateModal(true);
  };

  const openEditModal = (order: SupplierOrder) => {
    if (!checkPermission('Crear Orden Mayorista')) return;
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const openDeleteModal = (order: SupplierOrder) => {
    if (!checkPermission('Crear Orden Mayorista')) return;
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const openDetailsModal = (order: SupplierOrder) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowDetailsModal(false);
    setSelectedOrder(null);
    if (initialOrderId) {
      navigate({ search: {} as any });
    }
  };

  // Filter orders by supplier name, notes, date, or status
  const filteredOrders = orders.filter(o => {
    const search = searchTerm.toLowerCase();
    const supName = String(o.supplier_name || '').toLowerCase();
    const username = String(o.username || '').toLowerCase();
    const notes = String(o.notes || '').toLowerCase();
    const date = String(o.date || '').toLowerCase();
    const status = String(o.status || '').toLowerCase();
    const id = String(o.id || '');

    return (
      supName.includes(search) ||
      username.includes(search) ||
      notes.includes(search) ||
      date.includes(search) ||
      status.includes(search) ||
      id.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar órdenes por proveedor, notas, fecha, estado o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <Button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white self-start sm:self-center"
        >
          <Plus size={16} />
          Nueva Orden de Proveedor
        </Button>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchTerm ? 'No se encontraron resultados' : 'No hay órdenes registradas'}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {searchTerm
              ? `No encontramos órdenes que coincidan con "${searchTerm}"`
              : 'Genera tu primer orden de proveedor en el sistema'
            }
          </p>
          {!searchTerm && (
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2 mx-auto bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Crear Primera Orden
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Fecha Pedido
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Orden de Cliente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Artículos
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const statusInfo = getProgressStyles(order.status);

                  const totalPieces = calculateOrderTotalPieces(order, suppliers);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{order.supplier_name || `ID #${order.supplier_id}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-semibold">
                        {order.username || <span className="text-gray-400 italic text-xs">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{formatDateMX(order.date, 'DD/MM/YYYY')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 min-w-[100px]">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                          {String(order.status).toLowerCase() !== 'cancelado' && (
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-300 ${statusInfo.colorClass}`} style={{ width: `${statusInfo.percent}%` }}></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {order.total !== undefined && order.total !== null && order.total > 0 ? (
                          `$${order.total.toFixed(2)}`
                        ) : (
                          <span className="text-gray-400 font-normal italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.order_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            #{order.order_id}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No vinculado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {totalPieces} {totalPieces === 1 ? 'pieza' : 'piezas'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(order)}
                            className="p-1 h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(order)}
                            className="p-1 h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-full"
                            title="Editar pedido"
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(order)}
                            className="p-1 h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Eliminar pedido"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSupplierOrderModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onOrderCreated={handleOrderCreated}
        suppliers={suppliers}
        initialOrderId={initialOrderId}
      />

      <EditSupplierOrderModal
        isOpen={showEditModal}
        onClose={closeModals}
        onOrderUpdated={handleOrderUpdated}
        order={selectedOrder}
        suppliers={suppliers}
      />

      <DeleteSupplierOrderModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onOrderDeleted={handleOrderDeleted}
        order={selectedOrder}
      />

      <SupplierOrderDetailsModal
        isOpen={showDetailsModal}
        onClose={closeModals}
        order={selectedOrder}
        suppliers={suppliers}
      />
    </div>
  );
};

export default SupplierOrdersTab;
