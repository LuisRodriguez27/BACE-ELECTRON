import { Button } from '@/components/ui/button';
import { DollarSign, Edit3, Hash, Package, Plus, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CreateProductModal, DeleteProductModal, EditProductModal, ProductDetailView } from './components';
import { ProductsApiService } from './ProductsApiService';
import type { Product } from './types';
import { usePermissions } from '@/hooks/use-permissions';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Estados para vista detallada
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [detailProductId, setDetailProductId] = useState<number | null>(null);

  const { checkPermission } = usePermissions();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await ProductsApiService.findAll();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Validar que los datos sean válidos y filtrar
  const filteredProducts = products.filter(product => {
    // Validación defensiva: asegurar que el product sea válido
    if (!product || typeof product !== 'object' || !product.id || !product.name) {
      console.warn('Producto inválido encontrado en la lista:', product);
      return false;
    }
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.serial_number && product.serial_number.toLowerCase().includes(searchLower)) ||
      (product.description && product.description.toLowerCase().includes(searchLower))
    );
  });
  
  const handleProductCreated = (newProduct: Product) => {
    // Prepend the new product so it shows at the top of the list immediately
    setProducts(prevProducts => [newProduct, ...prevProducts]);
    toast.success('Producto creado exitosamente');
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    if (!updatedProduct || !updatedProduct.id) {
      console.error('Producto actualizado no válido:', updatedProduct);
      toast.error('Error: datos del producto inválidos');
      return;
    }
    
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product && product.id === updatedProduct.id ? updatedProduct : product
      )
    );
    toast.success(`Producto ${updatedProduct.name} actualizado exitosamente`);
  };

  const handleProductDeleted = (deletedProductId: number) => {
    const deletedProduct = products.find(p => p.id === deletedProductId);
    setProducts(prevProducts =>
      prevProducts.filter(product => product.id !== deletedProductId)
    );
    toast.success(`Producto ${deletedProduct?.name} eliminado exitosamente`);
  };

  const openCreateModal = () => {
    if (!checkPermission("Crear Producto")) {
      return;
    }
    setShowCreateModal(true);
  };

  const openEditModal = (product: Product) => {
    if (!checkPermission("Editar Producto")) {
      return;
    }
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    if (!checkPermission("Eliminar Producto")) {
      return;
    }
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const openProductDetail = (productId: number) => {
    setDetailProductId(productId);
    setCurrentView('detail');
  };

  const closeProductDetail = () => {
    setCurrentView('list');
    setDetailProductId(null);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedProduct(null);
  };

  // Si estamos en vista detallada, mostrar el componente correspondiente
  if (currentView === 'detail' && detailProductId) {
    return (
      <ProductDetailView
        productId={detailProductId}
        onBack={closeProductDetail}
        onProductUpdated={handleProductUpdated}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-2">
            Administra tu catálogo de productos personalizados
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={openCreateModal}
        >
          <Plus size={16} />
          Nuevo Producto
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
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos ({filteredProducts.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando tu primer producto al catálogo
              </p>
              <Button 
                className="flex items-center gap-2 mx-auto"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Agregar Primer Producto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditModal(product)}
                        className='p-1 h-8 w-8'
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openDeleteModal(product)}
                          className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {product.serial_number && (
                      <div className="flex items-center gap-2">
                        <Hash size={14} />
                        <span className="font-mono text-xs">{product.serial_number}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} />
                      <span className="font-semibold text-green-600">
                        ${product.price.toFixed(2)} MXN
                      </span>
                    </div>
                    
                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.active === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.active === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openProductDetail(product.id)}
                    >
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onProductCreated={handleProductCreated}
      />
      
      <EditProductModal
        isOpen={showEditModal}
        onClose={closeModals}
        onProductUpdated={handleProductUpdated}
        product={selectedProduct}
      />
      
      <DeleteProductModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onProductDeleted={handleProductDeleted}
        product={selectedProduct}
      />
      
    </div>
  );
};

export default ProductsPage;
