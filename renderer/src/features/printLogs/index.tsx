import { Button } from '@/components/ui/button';
import { 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import React, { useState, useRef } from 'react';
import CreatePrintLogModal from './components/CreatePrintLogModal';
import ActivePrintLogsTable from './components/ActivePrintLogsTable';
import PrintLogsHistoryTable from './components/PrintLogsHistoryTable';
import type { PrintLog, PrintLogsTableRef } from './types';

const PrintLogsFeature: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<PrintLog | null>(null);

  const activeTableRef = useRef<PrintLogsTableRef>(null);
  const historyTableRef = useRef<PrintLogsTableRef>(null);

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

  const handleLogUpdated = (updatedLog: PrintLog) => {
    activeTableRef.current?.handleLogUpdated(updatedLog);
    historyTableRef.current?.handleLogUpdated(updatedLog);
  };

  const handleEditClick = (log: PrintLog) => {
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
            Bitácora de Impresión
          </h1>
          <p className="text-gray-600 mt-2">
            Control de entregas de impresiones para mostrador y maquila
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
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Nueva Impresión
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
            activeTab === 'current'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Bitácora Actual
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Historial de Impresiones
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'current' ? (
          <ActivePrintLogsTable
            ref={activeTableRef}
            onEditClick={handleEditClick}
          />
        ) : (
          <PrintLogsHistoryTable
            ref={historyTableRef}
            onEditClick={handleEditClick}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreatePrintLogModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedLogForEdit(null);
        }}
        onLogCreated={handleLogCreated}
        onLogUpdated={handleLogUpdated}
        logToEdit={selectedLogForEdit}
      />
    </div>
  );
};

export default PrintLogsFeature;
