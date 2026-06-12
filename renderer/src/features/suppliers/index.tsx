import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { User, Phone, Mail, FileText, LayoutGrid, Search, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SuppliersApiService } from './SuppliersApiService';
import { CreateSupplierModal, EditSupplierModal, DeleteSupplierModal, SupplierOrdersTab } from './components';
import type { Supplier } from './types';
import { useSearch } from '@tanstack/react-router';

const SuppliersPage: React.FC = () => {
  const search = useSearch({ strict: false }) as any;
  const orderIdParam = search?.orderId ? Number(search.orderId) : null;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const { checkPermission } = usePermissions();

  useEffect(() => {
    if (orderIdParam) {
      setActiveTab('orders');
    }
  }, [orderIdParam]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async (showSuccessToast = false) => {
    try {
      setLoading(true);
      const data = await SuppliersApiService.findAll();
      setSuppliers(data);
      setError(null);
      if (showSuccessToast) {
        toast.success('Proveedores cargados exitosamente');
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Error al cargar proveedores');
      toast.error('Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierCreated = (newSupplier: Supplier) => {
    setSuppliers(prev => [newSupplier, ...prev]);
    toast.success('Proveedor registrado exitosamente');
  };

  const handleSupplierUpdated = (updatedSupplier: Supplier) => {
    setSuppliers(prev =>
      prev.map(item => (item.id === updatedSupplier.id ? updatedSupplier : item))
    );
    toast.success('Proveedor actualizado exitosamente');
  };

  const handleSupplierDeleted = (id: number) => {
    setSuppliers(prev => prev.filter(item => item.id !== id));
    toast.success('Proveedor desactivado exitosamente');
  };

  const openCreateModal = () => {
    if (!checkPermission('Ver Mayoristas')) return;
    setShowCreateModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    if (!checkPermission('Ver Mayoristas')) return;
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const openDeleteModal = (supplier: Supplier) => {
    if (!checkPermission('Ver Mayoristas')) return;
    setSelectedSupplier(supplier);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedSupplier(null);
  };

  // Filter suppliers based on local search term
  const filteredSuppliers = suppliers.filter(s =>
    s && s.name && (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.columns && s.columns.some(col => col.toLowerCase().includes(searchTerm.toLowerCase()))) ||
      s.id.toString().includes(searchTerm)
    )
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-800 font-medium">{error}</p>
          <Button
            onClick={() => fetchSuppliers(true)}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-7 w-7 text-blue-600" />
            Proveedores / Mayoristas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Administra los datos de tus proveedores y gestiona sus órdenes de compra
          </p>
        </div>
        {activeTab === 'suppliers' && (
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white self-start sm:self-center"
          >
            <Plus size={16} />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'suppliers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User size={14} /> Directorio de Proveedores
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={14} /> Órdenes de Compra
        </button>
      </div>

      {/* Conditionally Render Tabs */}
      {activeTab === 'suppliers' ? (
        <>
          {/* Search Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar proveedores por nombre, teléfono, correo o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Grid List */}
          {filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-16 text-center">
              <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchTerm ? 'No se encontraron resultados' : 'No hay proveedores registrados'}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {searchTerm
                  ? `No encontramos proveedores que coincidan con "${searchTerm}"`
                  : 'Comienza registrando tu primer proveedor en el sistema'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 mx-auto bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Agregar Primer Proveedor
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate">{supplier.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">ID Proveedor: #{supplier.id}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(supplier)}
                          className="p-1 h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                          title="Editar proveedor"
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(supplier)}
                          className="p-1 h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                          title="Eliminar proveedor"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      {supplier.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400 shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 italic text-xs">
                          <Phone size={14} className="shrink-0" />
                          <span>Sin teléfono registrado</span>
                        </div>
                      )}

                      {supplier.email ? (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 italic text-xs">
                          <Mail size={14} className="shrink-0" />
                          <span>Sin correo registrado</span>
                        </div>
                      )}

                      {supplier.columns && supplier.columns.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate">{supplier.columns.join(', ')}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {supplier.description && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex gap-1.5 items-start text-xs text-gray-500">
                        <FileText size={13} className="text-gray-400 shrink-0 mt-0.5" />
                        <p className="line-clamp-2">{supplier.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <SupplierOrdersTab suppliers={suppliers} initialOrderId={orderIdParam} />
      )}

      {/* Modals */}
      <CreateSupplierModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSupplierCreated={handleSupplierCreated}
      />

      <EditSupplierModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSupplierUpdated={handleSupplierUpdated}
        supplier={selectedSupplier}
      />

      <DeleteSupplierModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onSupplierDeleted={handleSupplierDeleted}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default SuppliersPage;
