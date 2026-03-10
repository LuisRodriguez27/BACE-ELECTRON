import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, DollarSign, Plus, Search, ShoppingCart, Printer } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { SimpleOrdersApiService } from './SimpleOrdersApiService';
import { generateSimpleOrdersLogbookHtml } from './logbook';
import type { SimpleOrder, SimpleOrderPayment } from './types';
import CreatePaymentModal from '../payments/components/CreatePaymentModal';
import CreateSimpleOrderModal from './components/CreateSimpleOrderModal';
import EditPaymentModal from '../payments/components/EditPaymentModal';
import { Eye, Pencil } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);

const SimpleOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentsListModal, setShowPaymentsListModal] = useState(false);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<SimpleOrderPayment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'paid'>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await SimpleOrdersApiService.getAll();
      setOrders(data);
    } catch (err: any) {
      console.error('Error fetching simple orders:', err);
      setError(err.message || 'Error al cargar órdenes rápidas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const handlePaymentCreated = (_payment: SimpleOrderPayment | number | any) => {
    // We can just refetch all logic for simplicity instead of manual state mutation
    fetchOrders();
  };

  const handleAddPayment = (orderId: number) => {
    setSelectedOrderId(orderId);
    setShowPaymentModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowPaymentModal(false);
    setShowPaymentsListModal(false);
    setShowEditPaymentModal(false);
    setSelectedOrderId(null);
    setSelectedPayment(null);
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

    const currentDate = dayjs().tz('America/Mexico_City').format('DD/MM/YYYY, h:mm A');
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
    let date = dayjs(dateString);
    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }
    return date.tz('America/Mexico_City').format('DD MMM YYYY, h:mm A');
  };

  // Filter
  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (filterStatus === 'pending' && order.balance <= 0) return false;
    if (filterStatus === 'paid' && order.balance > 0) return false;

    // Search Filter
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(s) ||
      order.concept.toLowerCase().includes(s) ||
      (order.client_name && order.client_name.toLowerCase().includes(s)) ||
      (order.user?.username && order.user.username.toLowerCase().includes(s))
    );
  });

  const totalIngresos = orders.reduce((sum, o) => sum + o.totalPaid, 0);
  const totalPendientes = orders.reduce((sum, o) => sum + Math.max(0, o.balance), 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={fetchOrders} className="mt-2" size="sm">Reintentar</Button>
        </div>
      </div>
    );
  }

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

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Órdenes</p>
            <p className="text-xl font-bold text-gray-900">{orders.length}</p>
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
                <th className="py-3 px-4 font-semibold uppercase">Fecha</th>
                <th className="py-3 px-4 font-semibold uppercase">Concepto</th>
                <th className="py-3 px-4 font-semibold uppercase">Cliente</th>
                <th className="py-3 px-4 font-semibold uppercase">Empleado</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Total</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Pagado</th>
                <th className="py-3 px-4 font-semibold uppercase text-right">Estado</th>
                <th className="py-3 px-4 font-semibold uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No se encontraron órdenes rápidas.
                  </td>
                </tr>
              )}
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-900 font-medium">#{order.id}</td>
                  <td className="py-3 px-4 text-gray-500">{formatDateTime(order.date)}</td>
                  <td className="py-3 px-4 text-gray-900">{order.concept}</td>
                  <td className="py-3 px-4 text-gray-500">{order.client_name || '-'}</td>
                  <td className="py-3 px-4 text-gray-500">{order.user?.username || 'N/A'}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium text-right">${order.total.toFixed(2)}</td>
                  <td className={`py-3 px-4 font-medium text-right ${order.balance > 0 && order.totalPaid > 0 ? 'text-orange-600' : order.balance <= 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    ${order.totalPaid.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {getPaymentBadge(order)}
                  </td>
                  <td className="py-3 px-4 flex justify-center gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateSimpleOrderModal
          isOpen={showCreateModal}
          onClose={closeModals}
          onOrderCreated={handleOrderCreated}
        />
      )}

      {selectedOrderId && (
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

    </div>
  );
};

export default SimpleOrdersPage;
