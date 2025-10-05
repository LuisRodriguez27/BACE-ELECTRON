import { Button } from '@/components/ui/button';
import { BudgetApiService } from '@/features/budgets/BudgetApiService';
import type { Budget } from '@/features/budgets/types';
import { DollarSign, Package, ShoppingBag, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Client } from '../types';

interface ClientBudgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const ClientBudgetModal: React.FC<ClientBudgetsModalProps> = ({ 
  isOpen, 
  onClose, 
  client
}) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client?.id) {
      fetchClientBudgets(client.id);
    }
  }, [isOpen, client?.id]);

  const fetchClientBudgets = async (clientId: number) => {
    try {
      setLoading(true);
      setError(null);
      const clientBudgets = await BudgetApiService.findByClientId(clientId);
      setBudgets(clientBudgets);
    } catch (err) {
      console.error('Error fetching client budgets:', err);
      setError('Error al cargar las presupuestos del cliente');
      toast.error('Error al cargar las presupuestos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <div className="flex justify-between items-center p-6 bbudget-b bbudget-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Presupuestos de {client.name}
              </h2>
              <p className="text-gray-500 text-sm">
                Historial completo de presupuestos del cliente
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
              <div className="animate-spin rounded-full h-8 w-8 bbudget-b-2 bbudget-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando presupuestos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-50 bbudget bbudget-red-200 rounded-lg p-4 inline-block">
                <p className="text-red-800">{error}</p>
                <Button 
                  onClick={() => client.id && fetchClientBudgets(client.id)}
                  className="mt-2"
                  size="sm"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay presupuestos
              </h3>
              <p className="text-gray-500">
                {client.name} aún no tiene presupuestos registradas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {budgets.length} {budgets.length === 1 ? 'presupuesto' : 'presupuestos'} encontradas
                </h3>
                <div className="text-sm text-gray-500">
                  Total: {formatCurrency(budgets.reduce((sum, budget) => sum + budget.total, 0))}
                </div>
              </div>

              <div className="grid gap-4">
                {budgets.map((budget) => (
                  <div 
                    key={budget.id} 
                    className="bbudget bbudget-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <Package size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Presupuesto #{budget.id}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Creada el {formatDate(budget.date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {formatCurrency(budget.total)}
                        </span>
                      </div>

                      {budget.budgetProducts && budget.budgetProducts.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-400" />
                          <span className="text-gray-600">
                            {budget.budgetProducts.length} {budget.budgetProducts.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bbudget-t bbudget-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientBudgetModal;