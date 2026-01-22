import { Button, Input, Label } from "@/components/ui";
import { ProductTemplatesApiService } from "@/features/productTemplates/ProductTemplatesApiService";
import { editProductTemplateSchema, type EditProductTemplateForm, type ProductTemplate } from "@/features/productTemplates/types";
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader, MapPin, Package, Palette, Percent, Ruler, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { extractErrorMessage } from '@/utils/errorHandling';

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUpdated: (template: ProductTemplate) => void;
  template: ProductTemplate | null;
}

const EditTemplateModal: React.FC<EditTemplateModalProps> = ({
  isOpen, onClose, onTemplateUpdated, template
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorsInput, setColorsInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditProductTemplateForm>({
    resolver: zodResolver(editProductTemplateSchema)
  });

  const [basePrice, setBasePrice] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setBasePrice(val);
      setPercentage(0);
    }
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newPercent = isNaN(val) ? 0 : val;
    setPercentage(newPercent);
    const calculatedPrice = basePrice * (1 + (newPercent / 100));
    setValue('final_price', parseFloat(calculatedPrice.toFixed(2)));
  };

  // Set form values when template changes
  useEffect(() => {
    if (template && isOpen) {
      setValue('final_price', template.final_price);
      setBasePrice(template.final_price);
      setPercentage(0);

      setValue('description', template.description || '');
      setValue('width', template.width);
      setValue('height', template.height);
      setValue('position', template.position || '');
      
      // Handle colors - ahora es texto plano
      if (template.colors) {
        setColorsInput(template.colors);
      } else {
        setColorsInput('');
      }
    }
  }, [template, isOpen, setValue]);

  const onSubmit = async (data: EditProductTemplateForm) => {
    if (!template) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      let processedData = { 
        ...data,
        colors: colorsInput.trim() || undefined,
        product_id: template.product_id
      };

      const updatedTemplate = await ProductTemplatesApiService.update(template.id, processedData);
      onTemplateUpdated(updatedTemplate);
      handleClose();
    } catch (err: any) {
      console.error('Error updating template:', err);
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

  if (!isOpen || !template) return null;

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
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Editar Plantilla</h2>
              <p className="text-sm text-gray-500">
                Producto: <span className="font-medium">{template.product_name}</span>
              </p>
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

          {/* Template Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Final Price */}
            <div>
              <Label htmlFor="final_price" className="text-sm font-medium text-gray-700">
                Precio Final *
              </Label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="final_price"
                  type="number"
                  step='0.01'
                  min='0'
                  placeholder="0.00"
                  className="pl-8"
                  {...register('final_price', { 
                    valueAsNumber: true,
                    onChange: handlePriceChange
                  })}
                />
              </div>
              {errors.final_price && (
                <p className="mt-1 text-sm text-red-600">{errors.final_price.message}</p>
              )}
            </div>

            {/* Percentage Adjustment */}
            <div>
              <Label htmlFor="percentage" className="text-sm font-medium text-gray-700">
                Ajuste % (Base inicial: ${basePrice.toFixed(2)})
              </Label>
              <div className="mt-1 relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="percentage"
                  type="number"
                  step='0.01'
                  placeholder="0"
                  className="pl-10"
                  value={percentage === 0 ? '' : percentage}
                  onChange={handlePercentageChange}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Descripción de la Plantilla *
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="description"
                  type="text"
                  placeholder="Ej: PROMOCIONES - Lona roja comercial"
                  className="pl-10"
                  {...register('description')}
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
                  step='0.01'
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
                  step='0.01'
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
                  <option value="completo">Completo</option>
                  <option value="contorno">Contorno</option>
                  <option value="frontal">Frontal</option>
                </select>
              </div>
              {errors.position && (
                <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
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
              {isSubmitting ? 'Actualizando...' : 'Actualizar Plantilla'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

};

export default EditTemplateModal;