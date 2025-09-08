import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, DollarSign, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentsApiService } from '@/features/payments/PaymentsApiService';
import { toast } from 'sonner';
import type { Payment } from '@/features/payments/types';
import type { Client } from '../types';

interface ClientPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const ClientPaymentsModal: React.FC<ClientPaymentsModalProps> = ({ 
  isOpen, 
  onClose, 
  client
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client?.id) {
      fetchClientPayments(client.id);
    }
  }, [isOpen, client?.id]);

  const fetchClientPayments = async (clientId: number) => {
    try {
      setLoading(true);
      setError(null);
      const clientPayments = await PaymentsApiService.findByClientId(clientId);
      setPayments(clientPayments);
    } catch (err) {
      console.error('Error fetching client payments:', err);
      setError('Error al cargar los pagos del cliente');
      toast.error('Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

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
            <div className="p-2 bg-green-100 rounded-lg">
              <CreditCard className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Historial de Pagos - {client.name}
              </h2>
              <p className="text-gray-500 text-sm">
                Todos los pagos realizados por el cliente
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Cargando pagos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">{error}</p>
                <Button 
                  onClick={() => client.id && fetchClientPayments(client.id)}
                  className="mt-2"
                  size="sm"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay pagos registrados
              </h3>
              <p className="text-gray-500">
                {client.name} aún no tiene pagos registrados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-green-900">
                      Resumen de Pagos
                    </h3>
                    <p className="text-green-700 text-sm">
                      {payments.length} {payments.length === 1 ? 'pago registrado' : 'pagos registrados'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(totalPayments)}
                    </p>
                    <p className="text-green-700 text-sm">
                      Total pagado
                    </p>
                  </div>
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Historial Detallado
                </h4>
                
                {payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-green-100 rounded">
                          <Receipt size={16} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900">
                              Pago 
                            </h5>
                            {payment.order?.id && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Orden #{payment.order.id}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-400" />
                              <span>{formatDate(payment.date)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-gray-400" />
                              <span className="font-medium text-green-600">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                          </div>

                          {payment.descripcion && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-start gap-2">
                                <FileText size={14} className="text-gray-400 mt-0.5" />
                                <p className="text-sm text-gray-600">
                                  <strong>Descripción:</strong> {payment.descripcion}
                                </p>
                              </div>
                            </div>
                          )}

                          {payment.order && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                                <span>
                                  <strong>Estado de orden:</strong> {payment.order.status}
                                </span>
                                <span>
                                  <strong>Total de orden:</strong> {formatCurrency(payment.order.total)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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

export default ClientPaymentsModal;