import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  Plus
} from 'lucide-react';
import React, { useState } from 'react';
import type { Payment } from '../types';
import { CreatePaymentModal, EditPaymentModal } from './';
import { usePermissions } from '@/hooks/use-permissions';

interface PaymentsListProps {
  payments: Payment[];
  orderId: number;
  orderTotal: number;
  clientName: string;
  onPaymentsChange: () => void;
  className?: string;
}

const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  orderId,
  orderTotal,
  clientName,
  onPaymentsChange,
  className = ''
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { checkPermission } = usePermissions();

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = orderTotal - totalPaid;
  const isFullyPaid = remainingAmount <= 0;

  const handleEditPayment = (payment: Payment) => {
    if (!checkPermission("Eliminar Pagos")) { // Usando este permiso para editar también
      return;
    }
    setSelectedPayment(payment);
    setShowEditModal(true);
  };

  const openCreatePaymentModal = () => {
    if (!checkPermission("Registrar Pagos")) {
      return;
    }
    setShowCreateModal(true);
  };

  const handlePaymentCreated = () => {
    onPaymentsChange();
    setShowCreateModal(false);
  };

  const handlePaymentUpdated = () => {
    onPaymentsChange();
    setShowEditModal(false);
    setSelectedPayment(null);
  };

  const handlePaymentDeleted = () => {
    onPaymentsChange();
    setShowEditModal(false);
    setSelectedPayment(null);
  };

  const getCurrentPaymentsExcluding = (excludeId: number) => {
    return payments
      .filter(p => p.id !== excludeId)
      .reduce((sum, payment) => sum + payment.amount, 0);
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

  const getPaymentStatusIcon = () => {
    if (isFullyPaid) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (totalPaid > 0) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    } else {
      return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPaymentStatusText = () => {
    if (isFullyPaid) {
      return 'Totalmente Pagado';
    } else if (totalPaid > 0) {
      return 'Pago Parcial';
    } else {
      return 'Sin Pagos';
    }
  };

  const getPaymentStatusColor = () => {
    if (isFullyPaid) {
      return 'text-green-600';
    } else if (totalPaid > 0) {
      return 'text-orange-600';
    } else {
      return 'text-gray-500';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pagos Registrados
              <span className="text-sm font-normal text-gray-500">
                ({payments.length})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {getPaymentStatusIcon()}
              <span className={`text-sm font-medium ${getPaymentStatusColor()}`}>
                {getPaymentStatusText()}
              </span>
            </div>
          </div>
          
          {!isFullyPaid && (
            <Button
              size="sm"
              onClick={openCreatePaymentModal}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Agregar Pago
            </Button>
          )}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total de la orden:</span>
            <p className="font-semibold text-gray-900">${orderTotal.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-gray-600">Total pagado:</span>
            <p className="font-semibold text-green-600">${totalPaid.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-gray-600">Monto pendiente:</span>
            <p className={`font-semibold ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
              ${remainingAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progreso de pago</span>
            <span>{totalPaid > 0 ? ((totalPaid / orderTotal) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isFullyPaid ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((totalPaid / orderTotal) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="p-6">
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h4>
            <p className="text-gray-500 mb-4">
              Esta orden aún no tiene pagos registrados
            </p>
            <Button 
              onClick={openCreatePaymentModal}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Registrar Primer Pago
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment, index) => (
              <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Pago</h4>
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
                    {/* <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Receipt size={14} />
                      Recibo
                    </Button> */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditPayment(payment)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 size={14} />
                      Editar
                    </Button>
                  </div>
                </div>
                
                {payment.descripcion && (
                  <div className="bg-gray-50 rounded p-3">
                    <span className="text-sm font-medium text-gray-700">Método de pago:</span>
                    <p className="text-sm text-gray-600 mt-1">{payment.descripcion}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <CreatePaymentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        orderId={orderId}
        orderTotal={orderTotal}
        currentPayments={totalPaid}
        onPaymentCreated={handlePaymentCreated}
        clientName={clientName}
      />

      <EditPaymentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        payment={selectedPayment}
        orderTotal={orderTotal}
        currentPayments={selectedPayment ? getCurrentPaymentsExcluding(selectedPayment.id) : 0}
        onPaymentUpdated={handlePaymentUpdated}
        onPaymentDeleted={handlePaymentDeleted}
        clientName={clientName}
      />
    </div>
  );
};

export default PaymentsList;