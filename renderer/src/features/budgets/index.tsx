import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/store/auth';
import { ArrowRight, Calendar, DollarSign, FileText, Loader2, Plus, Printer, Search, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BudgetApiService } from './BudgetApiService';
import CreateBudgetModal from './components/CreateBudgetModal';
import type { Budget } from './types';
import BudgetPrintPreviewModal from './components/BudgetPrintPreviewModal';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

dayjs.extend(utc);
dayjs.extend(timezone);

const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<number | null>(null);
  const { checkPermission } = usePermissions();
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransformDialog, setShowTransformDialog] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedBudgetForPrint, setSelectedBudgetForPrint] = useState<Budget | null>(null);

  const { user } = useAuthStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastBudgetElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasNext) {
        loadMoreBudgets();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loadingMore, pagination.hasNext]);

  const loadBudgets = async (page: number = 1, reset: boolean = true, searchQuery: string = '') => {
    try {
      console.log(`🔍 Cargando presupuestos - Página: ${page}, Límite: 10, Reset: ${reset}, Búsqueda: "${searchQuery}"`);

      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await BudgetApiService.getBudgetsPaginated(page, 10, searchQuery);

      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Respuesta de API inválida:', response);
        throw new Error('Formato de respuesta inválido');
      }

      if (reset) {
        setBudgets(response.data);
      } else {
        setBudgets(prev => [...prev, ...response.data]);
      }

      setPagination(response.pagination);
      setCurrentSearchTerm(searchQuery);

      console.log(`✅ Presupuestos cargados: ${response.data.length} | Total en BD: ${response.pagination.total} | Página actual: ${response.pagination.page}/${response.pagination.totalPages} | Hay más: ${response.pagination.hasNext}`);

    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Error al cargar presupuestos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreBudgets = () => {
    if (!loadingMore && pagination.hasNext) {
      console.log(`🔄 Scroll infinito detectado - Cargando página ${pagination.page + 1} con búsqueda: "${currentSearchTerm}"`);
      loadBudgets(pagination.page + 1, false, currentSearchTerm);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = window.setTimeout(() => {
      if (searchTerm !== currentSearchTerm) {
        console.log(`🔍 Realizando búsqueda: "${searchTerm}"`);
        loadBudgets(1, true, searchTerm);
      }
    }, 500);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const handleBudgetCreated = () => {
    loadBudgets(1, true, currentSearchTerm);
    toast.success('Presupuesto creado exitosamente');
  };

  const handleDeleteBudget = async (budgetId: number) => {
    if (!checkPermission("Eliminar Presupuestos")) {
      return;
    }

    setSelectedBudgetId(budgetId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBudget = async () => {
    if (!selectedBudgetId) return;

    try {
      setIsProcessing(true);
      await BudgetApiService.delete(selectedBudgetId);

      loadBudgets(1, true, currentSearchTerm);

      toast.success('Presupuesto eliminado exitosamente');
      setShowDeleteDialog(false);
      setSelectedBudgetId(null);
    } catch (err) {
      console.error('Error deleting budget:', err);
      toast.error('Error al eliminar presupuesto');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransformToOrder = async (budgetId: number) => {
    if (!checkPermission("Crear Órdenes")) {
      return;
    }

    setSelectedBudgetId(budgetId);
    setShowTransformDialog(true);
  };

  const confirmTransformToOrder = async () => {
    if (!selectedBudgetId) return;

    try {
      setIsProcessing(true);
      await BudgetApiService.transformToOrder(selectedBudgetId, user?.id!);
      toast.success('Presupuesto convertido a orden exitosamente');

      loadBudgets(1, true, currentSearchTerm);

      setShowTransformDialog(false);
      setSelectedBudgetId(null);
    } catch (err) {
      console.error('Error transforming budget to order:', err);
      toast.error('Error al convertir presupuesto a orden');
    } finally {
      setIsProcessing(false);
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
    let date = dayjs(dateString);
    // Si la hora es exactamente medianoche en UTC, sumar un día
    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }
    return date.tz('America/Mexico_City').format('D MMM YYYY');
  };

  const handlePrint = (budget: Budget) => {
    if (!budget) {
      toast.error('No hay datos para imprimir');
      return;
    }

    // Establecer el presupuesto a imprimir y abrir el modal
    setSelectedBudgetForPrint(budget);
    setShowPrintPreview(true);
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

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Presupuestos ({pagination.total})
            {currentSearchTerm && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (buscando: "{currentSearchTerm}")
              </span>
            )}
          </h2>
        </div>
        <div className="p-6">
          {budgets.length === 0 && !loading ? (
            <div className="text-center py-12">
              {currentSearchTerm ? (
                <>
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron presupuestos</h3>
                  <p className="text-gray-500 mb-4">
                    No hay presupuestos que coincidan con "<strong>{currentSearchTerm}</strong>"
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm('')}
                    size="sm"
                  >
                    Limpiar búsqueda
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {budgets.map((budget, index) => {
                  return (
                    <div
                      key={budget.id}
                      ref={index === budgets.length - 1 ? lastBudgetElementRef : null}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
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

                        <div className="flex items-center gap-3">
                          <Button
                            variant={"outline"}
                            size="sm"
                            onClick={() => handlePrint(budget)}
                          >
                            <Printer size={16} />
                            Imprimir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransformToOrder(budget.id)}
                            className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <ArrowRight size={14} />
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        {budget.client && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Cliente:</span>
                            <p className="text-xs text-gray-600">ID: {budget.client.id}</p>
                            <p className="text-sm text-gray-600">{budget.client.name}</p>
                            {budget.client.phone && (
                              <p className="text-xs text-gray-500">{budget.client.phone}</p>
                            )}
                          </div>
                        )}

                        {budget.user && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Creado por:</span>
                            <p className="text-sm text-gray-600">{budget.user.username}</p>
                          </div>
                        )}

                        {budget.budgetProducts && budget.budgetProducts.length > 0 && (
                          <div className="md:col-span-2">
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

              {loadingMore && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Cargando más presupuestos...</span>
                </div>
              )}

              {!loadingMore && !pagination.hasNext && budgets.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {currentSearchTerm
                      ? `Se encontraron ${pagination.total} resultado${pagination.total !== 1 ? 's' : ''} para "${currentSearchTerm}"`
                      : `Has visto todos los presupuestos (${pagination.total})`
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateBudgetModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onBudgetCreated={handleBudgetCreated}
        currentUserId={user?.id!}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedBudgetId(null);
        }}
        onConfirm={confirmDeleteBudget}
        title="Eliminar Presupuesto"
        message="¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={showTransformDialog}
        onClose={() => {
          setShowTransformDialog(false);
          setSelectedBudgetId(null);
        }}
        onConfirm={confirmTransformToOrder}
        title="Convertir a Orden"
        message="¿Deseas convertir este presupuesto en una orden? El presupuesto se marcará como convertido."
        confirmText="Convertir"
        cancelText="Cancelar"
        type="info"
        isLoading={isProcessing}
      />

      {selectedBudgetForPrint && (
        <BudgetPrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => {
            setShowPrintPreview(false);
            setSelectedBudgetForPrint(null);
          }}
          budgetData={selectedBudgetForPrint}
        />
      )}
    </div>
  );
};

export default BudgetsPage;
