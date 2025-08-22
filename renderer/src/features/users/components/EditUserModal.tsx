import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User as UserIcon, Lock, Loader, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UsersApiService } from '../UsersApiService';
import { editUserSchema, type EditUserForm, type User as UserType } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: UserType) => void;
  user: UserType | null;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onUserUpdated,
  user
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema)
  });

  useEffect(() => {
    if (user && isOpen) {
      setValue('username', user.username);
      setChangePassword(false);
      setShowPassword(false);
      setError(null);
    }
  }, [user, isOpen, setValue]);

  const onSubmit = async (data: EditUserForm) => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      const updateData: EditUserForm = {
        username: data.username
      };

      // Solo incluir password si se quiere cambiar
      if (changePassword && data.password) {
        updateData.password = data.password;
      }

      const updatedUser = await UsersApiService.update(user.id, updateData);
      onUserUpdated(updatedUser);
      reset();
      onClose();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Error al actualizar el usuario. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setChangePassword(false);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Usuario</h2>
              <p className="text-sm text-gray-500">Modificar información del usuario</p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Nombre de Usuario
              </Label>
              <div className="mt-1 relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="username"
                  type="text"
                  placeholder="Ingresa el nombre de usuario"
                  className="pl-10"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Change Password Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="changePassword"
                checked={changePassword}
                onCheckedChange={(checked: boolean) => setChangePassword(checked)}
              />
              <Label htmlFor="changePassword" className="text-sm text-gray-700">
                Cambiar contraseña
              </Label>
            </div>

            {/* Password */}
            {changePassword && (
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Nueva Contraseña
                </Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingresa la nueva contraseña"
                    className="pl-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            )}

            {/* User Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
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

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="animate-spin" size={16} />}
              {isSubmitting ? 'Actualizando...' : 'Actualizar Usuario'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;