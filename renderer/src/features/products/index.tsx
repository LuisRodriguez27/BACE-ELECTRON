import React from 'react';
import { Plus, Search, Filter, Package, DollarSign, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductsPage: React.FC = () => {
  // Datos de ejemplo (reemplazar con datos reales de la API)
  const products = [
    {
      id: 1,
      name: 'Camiseta Personalizada',
      serial_number: 'CAMI-001',
      price: 250.00,
      description: 'Camiseta 100% algodón con impresión personalizada',
      active: 1
    },
    {
      id: 2,
      name: 'Taza Sublimada',
      serial_number: 'TAZA-001',
      price: 150.00,
      description: 'Taza de cerámica con sublimación de alta calidad',
      active: 1
    }
  ];

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
        <Button className="flex items-center gap-2">
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
                    <Button variant="ghost" size="sm">
                      Editar
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
    </div>
  );
};

export default ProductsPage;
