import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Loader, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User as UserType } from '../types';

interface Permission {
  id: number;
  name: string;
  description?: string;
  active: number;
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      fetchPermissions();
    }
  }, [user, isOpen]);

  const fetchPermissions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Simular llamada a API para obtener permisos disponibles
      // En la implementación real, esto vendría de window.api.getAllPermissions()
      const mockPermissions: Permission[] = [
        { id: 1, name: 'users.create', description: 'Crear usuarios', active: 1 },
        { id: 2, name: 'users.read', description: 'Ver usuarios', active: 1 },
        { id: 3, name: 'users.update', description: 'Editar usuarios', active: 1 },
        { id: 4, name: 'users.delete', description: 'Eliminar usuarios', active: 1 },
        { id: 5, name: 'admin.system', description: 'Administración del sistema', active: 1 },
        { id: 6, name: 'reports.view', description: 'Ver reportes', active: 1 },
        { id: 7, name: 'reports.export', description: 'Exportar reportes', active: 1 },
        { id: 8, name: 'settings.manage', description: 'Gestionar configuración', active: 1 },
      ];

      setAvailablePermissions(mockPermissions);

      // Obtener permisos actuales del usuario
      const currentUserPermissions = user.userPermissions || [];
      const activePermissionIds = currentUserPermissions
        .filter(up => up.active === 1)
        .map(up => up.permission_id);
      
      setUserPermissions(activePermissionIds);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Error al cargar los permisos');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    setUserPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError(null);

      // En la implementación real, esto sería:
      // await window.api.updateUserPermissions(user.id, userPermissions);
      
      // Simular actualización exitosa
      console.log('Updating permissions for user:', user.id, 'with permissions:', userPermissions);
      
      // Simular respuesta con usuario actualizado
      const updatedUser: UserType = {
        ...user,
        userPermissions: availablePermissions
          .filter(p => userPermissions.includes(p.id))
          .map(p => ({
            permission_id: p.id,
            permission_name: p.name,
            active: 1
          }))
      };

      onPermissionsUpdated(updatedUser);
      onClose();
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError('Error al actualizar los permisos');
    } finally {
      setIsSaving(false);
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
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
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

            {/* User Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{user.username}</h3>
                  <p className="text-sm text-gray-500">
                    {userPermissions.length} permisos seleccionados
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <Label className="text-sm font-medium text-gray-700">
                Permisos disponibles
              </Label>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-gray-500">Cargando permisos...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={userPermissions.includes(permission.id)}
                        onCheckedChange={() => handlePermissionToggle(permission.id)}
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
                      {userPermissions.includes(permission.id) && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                  
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
            {userPermissions.length} de {availablePermissions.length} permisos seleccionados
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2"
            >
              {isSaving && <Loader className="animate-spin" size={16} />}
              {isSaving ? 'Guardando...' : 'Guardar Permisos'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsModal;