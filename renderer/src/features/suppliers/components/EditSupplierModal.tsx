import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, Mail, FileText, LayoutGrid, X, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/utils/errorHandling';
import { SuppliersApiService } from '../SuppliersApiService';
import { editSupplierSchema, type Supplier, type EditSupplierForm } from '../types';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierUpdated: (supplier: Supplier) => void;
  supplier: Supplier | null;
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierUpdated,
  supplier
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<EditSupplierForm>({
    resolver: zodResolver(editSupplierSchema)
  });

  // Reset form when supplier changes or modal opens
  useEffect(() => {
    if (supplier && isOpen) {
      reset({
        name: supplier.name,
        phone: supplier.phone || '',
        email: supplier.email || '',
        description: supplier.description || '',
        columns: supplier.columns || ''
      });
    }
  }, [supplier, isOpen, reset]);

  const onSubmit = async (data: EditSupplierForm) => {
    if (!supplier) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Convert empty strings to null for backend compatibility
      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        description: data.description || null,
        columns: data.columns || null
      };

      const updatedSupplier = await SuppliersApiService.update(supplier.id, payload);
      onSupplierUpdated(updatedSupplier);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error updating supplier:', err);
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

  if (!isOpen || !supplier) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Proveedor</h2>
              <p className="text-sm text-gray-500">Modificar la información del proveedor</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="name"
                  type="text"
                  placeholder="Nombre o Razón Social"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
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
                Teléfono
              </Label>
              <div className="mt-1 relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="phone"
                  type="text"
                  placeholder="Número de contacto (opcional)"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Correo Electrónico
              </Label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="email"
                  type="text"
                  placeholder="ejemplo@correo.com (opcional)"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Columns (Columnas) */}
            <div>
              <Label htmlFor="columns" className="text-sm font-medium text-gray-700">
                Columnas (Para tablas)
              </Label>
              <div className="mt-1 relative">
                <LayoutGrid className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="columns"
                  type="text"
                  placeholder="Ej: Pasillo A, Estante 3 (opcional)"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
                  {...register('columns')}
                />
              </div>
              {errors.columns && (
                <p className="mt-1 text-sm text-red-600">{errors.columns.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descripción / Detalles
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                  id="description"
                  placeholder="Información adicional sobre el proveedor o productos que surte..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
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
              className="text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSupplierModal;
