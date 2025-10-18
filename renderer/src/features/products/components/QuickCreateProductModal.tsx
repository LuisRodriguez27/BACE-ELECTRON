import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductSchema, type CreateProductForm, type Product } from '../types';
import { ProductsApiService } from '../ProductsApiService';
import { Button, Input, Label } from '@/components/ui';
import { X, Package, Loader } from 'lucide-react';

interface QuickCreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  prefilledName?: string; // Nombre prellenado
}

const QuickCreateProductModal: React.FC<QuickCreateProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  prefilledName = ''
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: prefilledName,
      serial_number: '',
      price: 0,
      description: ''
    }
  });

  // Actualizar el valor del nombre cuando cambie prefilledName
  useEffect(() => {
    if (prefilledName) {
      setValue('name', prefilledName);
    }
  }, [prefilledName, setValue]);

  const onSubmit = async (data: CreateProductForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const newProduct = await ProductsApiService.create(data);
      onProductCreated(newProduct);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.message || 'Error al crear el producto. Intente nuevamente.');
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
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Package className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Crear Producto</h2>
              <p className="text-sm text-gray-500">Agregar un nuevo producto</p>
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nombre del producto *
              </Label>
              <Input
                id="name"
                type="text"
                className="mt-1"
                placeholder="Ej: Camiseta básica"
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Número de serie */}
            <div>
              <Label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
                Número de serie
              </Label>
              <Input
                id="serial_number"
                type="text"
                className="mt-1"
                placeholder="Ej: CAM-001"
                {...register('serial_number')}
              />
              {errors.serial_number && (
                <p className="mt-1 text-sm text-red-600">{errors.serial_number.message}</p>
              )}
            </div>

            {/* Precio */}
            <div>
              <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                Precio *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                className="mt-1"
                placeholder="0.00"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descripción
              </Label>
              <textarea
                id="description"
                className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Descripción del producto (opcional)"
                {...register('description')}
              />
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
              {isSubmitting ? 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateProductModal;