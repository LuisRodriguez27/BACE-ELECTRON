import React from 'react';
import { Hammer } from 'lucide-react';
/*
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { User, Phone, Mail, FileText, LayoutGrid, Search, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SuppliersApiService } from './SuppliersApiService';
import { CreateSupplierModal, EditSupplierModal, DeleteSupplierModal } from './components';
import type { Supplier } from './types';
*/

const SuppliersPage: React.FC = () => {
  /*
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { checkPermission } = usePermissions();

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
      (s.columns && s.columns.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
  */

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-full border border-amber-200 dark:border-amber-900/50 animate-bounce">
        <Hammer className="h-12 w-12 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        En construcción
      </h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md text-base leading-relaxed">
        Esta sección de Proveedores y Mayoristas se encuentra actualmente en desarrollo y estará disponible próximamente.
      </p>
    </div>
  );
};

export default SuppliersPage;
