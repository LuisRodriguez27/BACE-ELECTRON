import React, { useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label } from "@/components/ui";
import { createProductSchema, type CreateProductForm, type Product } from "../types";
import { Loader, X, ShoppingBag, ScanBarcode, CircleDollarSign, FileText, Ruler, Palette, MapPin } from "lucide-react";
import { ProductsApiService } from "../ProductsApiService";
import { extractErrorMessage } from '@/utils/errorHandling';


interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen, onClose, onProductCreated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorsInput, setColorsInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema)
  });

  const onSubmit = async (data: CreateProductForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Convertir colors de string a array si es necesario
      let processedData = { ...data };
      if (colorsInput.trim()) {
        processedData.colors = colorsInput.split(',').map(color => color.trim()).filter(color => color);
      }

      const newProduct = await ProductsApiService.create(processedData);
      onProductCreated(newProduct);
      reset();
      setColorsInput('');
      onClose();
    } catch (err: any) {
      console.error('Error creating product:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setColorsInput('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

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
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Producto</h2>
              <p className="text-sm text-gray-500">Crear un nuevo producto del catálogo</p>
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
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nombre del Producto *
              </Label>
              <div className="mt-1 relative">
                <ShoppingBag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="name"
                  type="text"
                  placeholder="Ingresa el nombre del producto"
                  className="pl-10"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Serial Number */}
            <div>
              <Label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
                Número de Serie
              </Label>
              <div className="mt-1 relative">
                <ScanBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="serial_number"
                  type="text"
                  placeholder="Ej: TZ-001"
                  className="pl-10"
                  {...register('serial_number')}
                />
              </div>
              {errors.serial_number && (
                <p className="mt-1 text-sm text-red-600">{errors.serial_number.message}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                Precio *
              </Label>
              <div className="mt-1 relative">
                <CircleDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="price"
                  type="number"
                  step='1'
                  min='0'
                  placeholder="0.00"
                  className="pl-10"
                  {...register('price', { valueAsNumber: true })}
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>

            {/* Width */}
            <div>
              <Label htmlFor="width" className="text-sm font-medium text-gray-700">
                Ancho (m)
              </Label>
              <div className="mt-1 relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="width"
                  type="number"
                  step='0.1'
                  min='0'
                  placeholder="Ej: 2.0"
                  className="pl-10"
                  {...register('width', { valueAsNumber: true })}
                />
              </div>
              {errors.width && (
                <p className="mt-1 text-sm text-red-600">{errors.width.message}</p>
              )}
            </div>

            {/* Height */}
            <div>
              <Label htmlFor="height" className="text-sm font-medium text-gray-700">
                Alto (m)
              </Label>
              <div className="mt-1 relative">
                <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="height"
                  type="number"
                  step='0.1'
                  min='0'
                  placeholder="Ej: 3.0"
                  className="pl-10"
                  {...register('height', { valueAsNumber: true })}
                />
              </div>
              {errors.height && (
                <p className="mt-1 text-sm text-red-600">{errors.height.message}</p>
              )}
            </div>

            {/* Colors */}
            <div>
              <Label htmlFor="colors" className="text-sm font-medium text-gray-700">
                Colores
              </Label>
              <div className="mt-1 relative">
                <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="colors"
                  type="text"
                  placeholder="rojo, azul, blanco"
                  className="pl-10"
                  value={colorsInput}
                  onChange={(e) => setColorsInput(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Separa los colores con comas</p>
            </div>

            {/* Position */}
            <div>
              <Label htmlFor="position" className="text-sm font-medium text-gray-700">
                Posición
              </Label>
              <div className="mt-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <select
                  id="position"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  {...register('position')}
                >
                  <option value="">Seleccionar posición</option>
                  <option value="centro">Centro</option>
                  <option value="superior">Superior</option>
                  <option value="inferior">Inferior</option>
                  <option value="izquierda">Izquierda</option>
                  <option value="derecha">Derecha</option>
                </select>
              </div>
              {errors.position && (
                <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
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
              {isSubmitting ? 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

};

export default CreateProductModal;