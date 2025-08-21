import React from 'react';
import { Plus, Search, Filter, UserCog, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UsersPage: React.FC = () => {
  // Datos de ejemplo (reemplazar con datos reales de la API)
  const users = [
    {
      id: 1,
      username: 'admin',
      active: 1,
      permissions: ['Administrar Usuarios', 'Crear Órdenes', 'Ver Reportes']
    },
    {
      id: 2,
      username: 'operador1',
      active: 1,
      permissions: ['Crear Órdenes', 'Ver Clientes']
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus size={16} />
          Nuevo Usuario
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
                placeholder="Buscar usuarios..."
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

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Usuarios ({users.length})
          </h2>
        </div>
        <div className="p-6">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-500 mb-4">
                Comienza agregando el primer usuario del sistema
              </p>
              <Button className="flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Agregar Primer Usuario
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.username}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.active === 1 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Editar Permisos
                      </Button>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                  
                  {user.permissions && user.permissions.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Permisos:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.permissions.map((permission, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
