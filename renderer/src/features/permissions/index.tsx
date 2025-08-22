import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Shield, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionsApiService } from './PermissionsApiService';
import type { Permission } from './types';

const PermissionsPage: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const data = await PermissionsApiService.findAll();
        setPermissions(data);
        console.log('Permisos cargados:', data);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setError('Error al cargar permisos');
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
          <p className="text-gray-600 mt-2">
            Administra los permisos del sistema y asigna permisos a usuarios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Users size={16} />
            Asignar Permisos
          </Button>
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            Nuevo Permiso
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar permisos..."
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

      {/* Lista de permisos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Permisos del Sistema ({permissions.length})
          </h2>
        </div>
        <div className="p-6">
          {permissions.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay permisos configurados</h3>
              <p className="text-gray-500 mb-4">
                Comienza creando los permisos básicos del sistema
              </p>
              <Button className="flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Crear Primer Permiso
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Shield size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{permission.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          permission.active === 1 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {permission.active === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Settings size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  {permission.description && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {permission.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      ID: {permission.id}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        Asignar
                      </Button>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sección de estadísticas */}
      {permissions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Total Permisos</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">{permissions.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Permisos Activos</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {permissions.filter(p => p.active === 1).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Permisos Inactivos</h3>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {permissions.filter(p => p.active === 0).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
