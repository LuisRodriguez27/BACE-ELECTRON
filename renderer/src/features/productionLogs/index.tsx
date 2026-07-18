import { Button } from '@/components/ui/button';
import { 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import React, { useState, useRef } from 'react';
import CreateProductionLogModal from './components/CreateProductionLogModal';
import ActiveProductionLogsTable from './components/ActiveProductionLogsTable';
import ProductionLogsHistoryTable from './components/ProductionLogsHistoryTable';
import { useOrderDetailsModal } from '@/hooks/use-order-details-modal';
import type { ProductionLog, ProductionLogsTableRef } from './types';

const ProductionLogsFeature: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<ProductionLog | null>(null);
  const { openOrder, orderDetailsModal } = useOrderDetailsModal();

  const activeTableRef = useRef<ProductionLogsTableRef>(null);
  const historyTableRef = useRef<ProductionLogsTableRef>(null);

  const handleRefresh = () => {
    if (activeTab === 'current') {
      activeTableRef.current?.refresh();
    } else {
      historyTableRef.current?.refresh();
    }
  };

  const handleLogCreated = () => {
    if (activeTab === 'current') {
      activeTableRef.current?.refresh();
    } else {
      historyTableRef.current?.refresh();
    }
  };

  const handleLogUpdated = (updatedLog: ProductionLog) => {
    activeTableRef.current?.handleLogUpdated(updatedLog);
    historyTableRef.current?.handleLogUpdated(updatedLog);
  };

  const handleEditClick = (log: ProductionLog) => {
    setSelectedLogForEdit(log);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="p-6">
      <style>{`
        @keyframes blink-red-light {
          0% { background-color: rgba(254, 226, 226, 0.35); }
          50% { background-color: rgba(254, 202, 202, 0.75); }
          100% { background-color: rgba(254, 226, 226, 0.35); }
        }
        @keyframes blink-red-dark {
          0% { background-color: rgba(127, 29, 29, 0.2); }
          50% { background-color: rgba(127, 29, 29, 0.5); }
          100% { background-color: rgba(127, 29, 29, 0.2); }
        }
        .animate-blink-red {
          animation: blink-red-light 2s infinite ease-in-out;
        }
        .dark .animate-blink-red {
          animation: blink-red-dark 2s infinite ease-in-out;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Bitácora de Producción
          </h1>
          <p className="text-gray-600 mt-2">
            Control de entregas de trabajos de producción y acabados para mostrador y maquila
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus size={18} />
            Nueva Producción
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
            activeTab === 'current'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Bitácora Actual
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Historial de Producción
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'current' ? (
          <ActiveProductionLogsTable
            ref={activeTableRef}
            onEditClick={handleEditClick}
            onOrderClick={openOrder}
          />
        ) : (
          <ProductionLogsHistoryTable
            ref={historyTableRef}
            onEditClick={handleEditClick}
            onOrderClick={openOrder}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateProductionLogModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedLogForEdit(null);
        }}
        onLogCreated={handleLogCreated}
        onLogUpdated={handleLogUpdated}
        logToEdit={selectedLogForEdit}
      />

      {orderDetailsModal}
    </div>
  );
};

export default ProductionLogsFeature;
