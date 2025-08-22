import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, UserCog, Shield, User, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsersApiService } from './UsersApiService';
import { CreateUserModal, EditUserModal, DeleteUserModal, UserPermissionsModal } from './components';
import type { User as UserType } from './types';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await UsersApiService.findAll();
      console.log('Fetched users:', data);      
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserCreated = (newUser: UserType) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
  };

  const handleUserUpdated = (updatedUser: UserType) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    );
  };

  const handleUserDeleted = (deletedUserId: number) => {
    setUsers(prevUsers =>
      prevUsers.filter(user => user.id !== deletedUserId)
    );
  };

  const openEditModal = (user: UserType) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: UserType) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openPermissionsModal = (user: UserType) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowPermissionsModal(false);
    setSelectedUser(null);
  };

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={fetchUsers} 
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            Usuarios ({filteredUsers.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? `No hay usuarios que coincidan con "${searchTerm}"` 
                  : 'Comienza agregando el primer usuario del sistema'
                }
              </p>
              {!searchTerm && (
                <Button 
                  className="flex items-center gap-2 mx-auto"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Agregar Primer Usuario
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
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
                          <span className="text-xs text-gray-500">
                            ID: {user.id}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openPermissionsModal(user)}
                      >
                        <Shield size={14} className="mr-1" />
                        Permisos
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditModal(user)}
                      >
                        <Edit3 size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openDeleteModal(user)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Eliminar
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
                  
                  {user.userPermissions && user.userPermissions.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Permisos Detallados:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.userPermissions.map((userPerm, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 text-xs rounded-md ${
                              userPerm.active === 1 
                                ? 'bg-green-50 text-green-700' 
                                : 'bg-gray-50 text-gray-500'
                            }`}
                          >
                            {userPerm.permission_name}
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

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onUserCreated={handleUserCreated}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={closeModals}
        onUserUpdated={handleUserUpdated}
        user={selectedUser}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onUserDeleted={handleUserDeleted}
        user={selectedUser}
      />

      <UserPermissionsModal
        isOpen={showPermissionsModal}
        onClose={closeModals}
        onPermissionsUpdated={handleUserUpdated}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;