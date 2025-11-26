import { Button, Input, Label } from '@/components/ui';
import { extractErrorMessage } from '@/utils/errorHandling';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDollarSign, FileText, Loader, ScanBarcode, ShoppingBag, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProductsApiService } from '../ProductsApiService';
import { editProductSchema, type EditProductForm, type Product } from '../types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: (product: Product) => void;
  product: Product | null;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  product
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditProductForm>({
    resolver: zodResolver(editProductSchema)
  });

  useEffect(() => {
    if (product && isOpen) {
      setValue('name', product.name);
      setValue('serial_number', product.serial_number || '');
      setValue('price', product.price);
      setValue('description', product.description || '');
      
      setError(null);
    }
  }, [product, isOpen, setValue]);

  const onSubmit = async (data: EditProductForm) => {
    if (!product) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Convertir colors de string a array si es necesario
      let processedData = { ...data };

      const updatedProduct = await ProductsApiService.update(product.id, processedData);
      // Aseguramos que el producto actualizado tenga el ID correcto
      const productWithId = { ...updatedProduct, id: product.id };
      onProductUpdated(productWithId);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error updating product:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    };
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Producto</h2>
              <p className="text-sm text-gray-500">Modificar información del producto</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <Label htmlFor='name' className='text-sm font-medium text-gray-700'>
                Nombre del Producto *
              </Label>
              <div className='mt-1 relative'>
                <ShoppingBag className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' size={16} />
                <Input
                  id='name'
                  type='text'
                  placeholder='Nombre del producto'
                  className='pl-10'
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className='mt-1 text-sm text-red-600'>{errors.name.message}</p>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <Label htmlFor='serial_number' className='text-sm font-medium text-gray-700'>
                Número de Serie 
              </Label>
              <div className='mt-1 relative'>
                <ScanBarcode className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' size={16} />
                <Input
                  id='serial_number'
                  type='text'
                  placeholder='Número de serie (opcional)'
                  className='pl-10'
                  {...register('serial_number')}
                />
              </div>
              {errors.serial_number && (
                <p className='mt-1 text-sm text-red-600'>{errors.serial_number.message}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <Label htmlFor='price' className='text-sm font-medium text-gray-700'>
                Precio *
              </Label>
              <div className='mt-1 relative'>
                <CircleDollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' size={16} />
                <Input
                  id='price'
                  type='number'
                  step='0.01'
                  min='0'
                  placeholder='Precio del producto'
                  className='pl-10'
                  {...register('price', { valueAsNumber: true })}
                />
              </div>
              {errors.price && (
                <p className='mt-1 text-sm text-red-600'>{errors.price.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descripción
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                  id="description"
                  placeholder="Información adicional del producto (opcional)"
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
              {isSubmitting ? 'Actualizando...' : 'Actualizar Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );  
};  

export default EditProductModal;