import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/utils/errorHandling';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader, MapPin, Phone, User as UserIcon, X } from 'lucide-react';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ClientApiService } from '../ClientApiService';
import { createClientSchema, type Client, type CreateClientForm } from '../types';
import ColorSelector from './ColorSelector';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: Client) => void;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ 
  isOpen, 
  onClose, 
  onClientCreated 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control
  } = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema)
  });

  const onSubmit = async (data: CreateClientForm) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const newClient = await ClientApiService.create(data);
      onClientCreated(newClient);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error creating client:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Cliente</h2>
              <p className="text-sm text-gray-500">Agregar un nuevo cliente al sistema</p>
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
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nombre *
              </Label>
              <div className="mt-1 relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="name"
                  type="text"
                  placeholder="Nombre completo del cliente"
                  className="pl-10"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Teléfono *
              </Label>
              <div className="mt-1 relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="phone"
                  type="number"
                  placeholder="Número de teléfono"
                  className="pl-10"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Color */}
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Color de identificación
              </Label>
              <div className="mt-1">
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <ColorSelector
                      value={field.value || null}
                      onChange={field.onChange}
                      placeholder="Seleccionar color (opcional)"
                    />
                  )}
                />
              </div>
              {errors.color && (
                <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Dirección
              </Label>
              <div className="mt-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="address"
                  type="text"
                  placeholder="Dirección del cliente (opcional)"
                  className="pl-10"
                  {...register('address')}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descripción
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                  id="description"
                  placeholder="Información adicional del cliente (opcional)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  {...register('description')}
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
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
              {isSubmitting ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClientModal;
