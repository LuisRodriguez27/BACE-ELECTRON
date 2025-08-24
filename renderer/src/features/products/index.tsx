import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Package, DollarSign, Hash, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductsApiService } from './ProductsApiService';
import type { Product } from './types';
import { CreateProductModal } from './components';
import { toast } from 'sonner';
import EditClientModal from './components/EditProductModal';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) 
  );
  
  const handleProductCreated = (newProduct: Product) => {
    setProducts(prevProducts => [...prevProducts, newProduct]);
    toast.success('Producto creado exitosamente');
  };

  const handleClientUpdated = (updatedProduct: Product) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === updatedProduct.id ? updatedProduct : product
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

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedProduct(null);
  };

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
          onClick={() => setShowCreateModal(true)}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </Button>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Productos ({products.length})
          </h2>
        </div>
        <div className="p-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando tu primer producto al catálogo
              </p>
              <Button className="flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Agregar Primer Producto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditModal(product)}
                      className='p-1 h-8 w-8'
                    >
                      <Edit3 size={14} />
                    </Button>
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
                    <Button variant="outline" size="sm">
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
      
      <EditClientModal
        isOpen={showEditModal}
        onClose={closeModals}
        onProductUpdated={handleClientUpdated}
        product={selectedProduct}
      />
      
      
    </div>
  );
};

export default ProductsPage;
