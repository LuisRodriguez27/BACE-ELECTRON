import React from 'react';
import { Plus, Search, Filter, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrdersPage: React.FC = () => {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Órdenes</h1>
          <p className="text-gray-600 mt-2">
            Administra las órdenes de producción y su estado
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={16} />
          Nueva Orden
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
                placeholder="Buscar órdenes..."
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

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Órdenes Activas</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
            <p className="text-gray-500 mb-4">
              Comienza creando tu primera orden de producción
            </p>
            <Button className="flex items-center gap-2 mx-auto">
              <Plus size={16} />
              Crear Primera Orden
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
