import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/store/auth';
import { Calendar, DollarSign, FileText, Plus, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BudgetApiService } from './BudgetApiService';
import CreateBudgetModal from './components/CreateBudgetModal';
import type { Budget } from './types';

const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { checkPermission } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);
        const data = await BudgetApiService.findAll();
        setBudgets(data);
      } catch (err) {
        console.error('Error fetching budgets:', err);
        setError('Error al cargar presupuestos');
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  const handleBudgetCreated = (newBudget: Budget) => {
    setBudgets(prevBudgets => [newBudget, ...prevBudgets]);
    toast.success('Presupuesto creado exitosamente');
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!checkPermission("Eliminar Presupuestos")) {
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await BudgetApiService.delete(budgetId);
      setBudgets(prevBudgets => prevBudgets.filter(b => b.id !== budgetId));
      toast.success('Presupuesto eliminado exitosamente');
    } catch (err) {
      console.error('Error deleting budget:', err);
      toast.error('Error al eliminar presupuesto');
    }
  };

  const handleTransformToOrder = async (budgetId: number) => {
    if (!checkPermission("Crear Órdenes")) {
      return;
    }

    if (!confirm('¿Deseas convertir este presupuesto en una orden?')) {
      return;
    }

    try {
      await BudgetApiService.transformToOrder(budgetId, user?.id!);
      toast.success('Presupuesto convertido a orden exitosamente');
      // Opcionalmente, eliminar el presupuesto de la lista
      setBudgets(prevBudgets => prevBudgets.filter(b => b.id !== budgetId));
    } catch (err) {
      console.error('Error transforming budget to order:', err);
      toast.error('Error al convertir presupuesto a orden');
    }
  };

  const openCreateModal = () => {
    if (!checkPermission("Crear Presupuestos")) {
      return;
    }
    setShowCreateModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función de filtrado
  const filteredBudgets = budgets.filter(budget => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Buscar por ID
    const idMatch = budget.id.toString().includes(searchLower);
    
    // Buscar por nombre del cliente
    const clientNameMatch = budget.client && budget.client.name.toLowerCase().includes(searchLower);
    
    // Buscar por teléfono del cliente
    const clientPhoneMatch = budget.client && budget.client.phone && budget.client.phone.includes(searchLower);
    
    return idMatch || clientNameMatch || clientPhoneMatch;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Presupuestos</h1>
          <p className="text-gray-600 mt-2">
            Administra los presupuestos creados para clientes
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={openCreateModal}
        >
          <Plus size={16} />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por ID, cliente o teléfono..."
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

      {/* Lista de presupuestos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Presupuestos ({filteredBudgets.length}{budgets.length !== filteredBudgets.length ? ` de ${budgets.length}` : ''})
          </h2>
        </div>
        <div className="p-6">
          {budgets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay presupuestos</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando tu primer presupuesto
              </p>
              <Button 
                className="flex items-center gap-2 mx-auto"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Crear Primer Presupuesto
              </Button>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron presupuestos</h3>
              <p className="text-gray-500 mb-4">
                No hay presupuestos que coincidan con tu búsqueda: "{searchTerm}"
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
              {filteredBudgets.map((budget) => {
                return (
                  <div key={budget.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Presupuesto #{budget.id}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Fecha: {formatDate(budget.date)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} />
                            <span className="font-semibold text-blue-600">
                              Total: ${budget.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTransformToOrder(budget.id)}
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <FileText size={14} />
                          Convertir a Orden
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteBudget(budget.id)}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Información adicional */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      {budget.client && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Cliente:</span>
                          <p className="text-sm text-gray-600">{budget.client.name}</p>
                          {budget.client.phone && (
                            <p className="text-xs text-gray-500">{budget.client.phone}</p>
                          )}
                        </div>
                      )}
                      
                      {budget.budgetProducts && budget.budgetProducts.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Productos:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {budget.budgetProducts.map((bp, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {bp.product_name} (x{bp.quantity})
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

      {/* Modal de creación */}
      <CreateBudgetModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onBudgetCreated={handleBudgetCreated}
        currentUserId={user?.id!}
      />
    </div>
  );
};

export default BudgetsPage;
