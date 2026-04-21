import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Loader, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionsApiService } from '../../permissions/PermissionsApiService';
import type { User as UserType } from '../types';

interface Permission {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated: (user: UserType) => void;
  user: UserType | null;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsUpdated,
  user
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState<number | null>(null);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      fetchData();
    }
  }, [user, isOpen]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Obtener todos los permisos disponibles
      const allPermissions = await PermissionsApiService.findAll();
      setAvailablePermissions(allPermissions);

      // Obtener permisos del usuario
      const currentUserPermissions = await PermissionsApiService.findByUserId(user.id);
      setUserPermissions(currentUserPermissions);

    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Error al cargar los permisos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = async () => {
    if (!user || isLoading) return;

    try {
      setIsSelectingAll(true);
      setError(null);

      // Obtener permisos que el usuario NO tiene actualmente
      const userPermissionIds = getUserPermissionIds();
      const permissionsToAssign = filteredPermissions.filter(
        permission => !userPermissionIds.includes(permission.id)
      );

      // Asignar todos los permisos faltantes
      for (const permission of permissionsToAssign) {
        try {
          const updatedUser = await PermissionsApiService.assignToUser({
            user_id: user.id,
            permission_id: permission.id
          });

          // Actualizar estado local
          setUserPermissions(prev => [...prev, permission]);

          // Notificar al componente padre del usuario actualizado
          onPermissionsUpdated(updatedUser);
        } catch (err: any) {
          console.error(`Error assigning permission ${permission.name}:`, err);
          // Continuar con el siguiente permiso aunque uno falle
        }
      }

    } catch (err: any) {
      console.error('Error in select all:', err);
      setError('Error al asignar todos los permisos');
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handleDeselectAll = async () => {
    if (!user || isLoading) return;

    try {
      setIsSelectingAll(true);
      setError(null);

      // Obtener permisos que el usuario SI tiene actualmente (de los filtrados)
      const userPermissionIds = getUserPermissionIds();
      const permissionsToRemove = filteredPermissions.filter(
        permission => userPermissionIds.includes(permission.id)
      );

      // Remover todos los permisos
      for (const permission of permissionsToRemove) {
        try {
          const updatedUser = await PermissionsApiService.removeFromUser({
            user_id: user.id,
            permission_id: permission.id
          });

          // Actualizar estado local
          setUserPermissions(prev => prev.filter(p => p.id !== permission.id));

          // Notificar al componente padre del usuario actualizado
          onPermissionsUpdated(updatedUser);
        } catch (err: any) {
          console.error(`Error removing permission ${permission.name}:`, err);
          // Continuar con el siguiente permiso aunque uno falle
        }
      }

    } catch (err: any) {
      console.error('Error in deselect all:', err);
      setError('Error al remover todos los permisos');
    } finally {
      setIsSelectingAll(false);
    }
  };

  const handlePermissionToggle = async (permission: Permission) => {
    if (!user) return;

    const hasPermission = userPermissions.some(up => up.id === permission.id);

    try {
      setIsUpdatingPermission(permission.id);
      setError(null);

      let updatedUser: UserType;

      if (hasPermission) {
        // Remover permiso
        updatedUser = await PermissionsApiService.removeFromUser({
          user_id: user.id,
          permission_id: permission.id
        });

        // Actualizar estado local
        setUserPermissions(prev => prev.filter(p => p.id !== permission.id));
      } else {
        // Agregar permiso
        updatedUser = await PermissionsApiService.assignToUser({
          user_id: user.id,
          permission_id: permission.id
        });

        // Actualizar estado local
        setUserPermissions(prev => [...prev, permission]);
      }

      // Notificar al componente padre del usuario actualizado
      onPermissionsUpdated(updatedUser);

    } catch (err: any) {
      console.error('Error updating permission:', err);
      setError(err.message || 'Error al actualizar el permiso');
    } finally {
      setIsUpdatingPermission(null);
    }
  };

  const handleClose = () => {
    setError(null);
    setSearchTerm('');
    onClose();
  };

  const filteredPermissions = availablePermissions.filter(permission =>
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getUserPermissionIds = () => userPermissions.map(p => p.id);

  // Verificar si todos los permisos filtrados están seleccionados
  const allFilteredSelected = () => {
    const userPermissionIds = getUserPermissionIds();
    return filteredPermissions.every(permission =>
      userPermissionIds.includes(permission.id)
    );
  };

  // Verificar si ningún permiso filtrado está seleccionado
  const noneFilteredSelected = () => {
    const userPermissionIds = getUserPermissionIds();
    return !filteredPermissions.some(permission =>
      userPermissionIds.includes(permission.id)
    );
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gestionar Permisos</h2>
              <p className="text-sm text-gray-500">Usuario: {user.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex-shrink-0">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Search and Select All */}
            <div className="space-y-4 flex-shrink-0">
              {/* Search */}
              <div>
                <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                  Buscar permisos
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Select All Controls */}
              {filteredPermissions.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Acciones masivas para {filteredPermissions.length} permisos
                      {searchTerm && ' (filtrados)'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAll}
                      disabled={isSelectingAll || isUpdatingPermission !== null || allFilteredSelected()}
                      className="text-xs"
                    >
                      {isSelectingAll ? (
                        <>
                          <Loader className="h-3 w-3 animate-spin mr-1" />
                          Asignando...
                        </>
                      ) : (
                        'Seleccionar todos'
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDeselectAll}
                      disabled={isSelectingAll || isUpdatingPermission !== null || noneFilteredSelected()}
                      className="text-xs"
                    >
                      {isSelectingAll ? (
                        <>
                          <Loader className="h-3 w-3 animate-spin mr-1" />
                          Removiendo...
                        </>
                      ) : (
                        'Deseleccionar todos'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="mb-4 mt-4 p-4 bg-gray-50 rounded-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{user.username}</h3>
                  <p className="text-sm text-gray-500">
                    {userPermissions.length} de {availablePermissions.length} permisos asignados
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="space-y-2 overflow-y-auto mt-2 flex-1 min-h-0 pr-1">
              <Label className="text-sm font-medium text-gray-700 sticky top-0 bg-white pb-2 block z-10">
                Permisos disponibles
              </Label>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-gray-500">Cargando permisos...</span>
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {filteredPermissions.map((permission) => {
                    const hasPermission = getUserPermissionIds().includes(permission.id);
                    const isUpdating = isUpdatingPermission === permission.id;

                    return (
                      <div
                        key={permission.id}
                        className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg transition-colors ${isUpdating ? 'bg-blue-50' : 'hover:bg-gray-50'
                          } ${isSelectingAll ? 'opacity-60' : ''}`}
                      >
                        <Checkbox
                          id={`permission-${permission.id}`}
                          checked={hasPermission}
                          onCheckedChange={() => handlePermissionToggle(permission)}
                          disabled={isUpdating || isSelectingAll}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`permission-${permission.id}`}
                            className="text-sm font-medium text-gray-900 cursor-pointer"
                          >
                            {permission.name}
                          </Label>
                          {permission.description && (
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isUpdating && (
                            <Loader className="h-4 w-4 text-blue-600 animate-spin" />
                          )}
                          {hasPermission && !isUpdating && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredPermissions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron permisos</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {userPermissions.length} de {availablePermissions.length} permisos asignados
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdatingPermission !== null || isSelectingAll}
            >
              {isUpdatingPermission !== null || isSelectingAll ? 'Actualizando...' : 'Cerrar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsModal;