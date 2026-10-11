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
  const [columnsList, setColumnsList] = useState<string[]>(['']);

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
        description: supplier.description || ''
      });
      setColumnsList(supplier.columns && supplier.columns.length > 0 ? [...supplier.columns] : ['']);
    }
  }, [supplier, isOpen, reset]);

  const handleAddColumn = () => {
    setColumnsList([...columnsList, '']);
  };

  const handleRemoveColumn = (index: number) => {
    setColumnsList(columnsList.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index: number, value: string) => {
    const updated = [...columnsList];
    updated[index] = value;
    setColumnsList(updated);
  };

  const onSubmit = async (data: EditSupplierForm) => {
    if (!supplier) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Filter empty columns and build payload
      const cleanedColumns = columnsList.map(c => c.trim()).filter(c => c.length > 0);

      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        description: data.description || null,
        columns: cleanedColumns.length > 0 ? cleanedColumns : null
      };

      const updatedSupplier = await SuppliersApiService.update(supplier.id, payload as any);
      onSupplierUpdated(updatedSupplier);
      reset();
      setColumnsList(['']);
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
    setColumnsList(['']);
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
            type="button"
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

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                  type="tel"
                  maxLength={10}
                  placeholder="Número de contacto (opcional)"
                  className="pl-10 focus:ring-blue-500 focus:border-blue-500"
                  {...register('phone', {
                    onChange: (e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      e.target.value = val.slice(0, 10);
                    }
                  })}
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Columnas para Pedidos
              </Label>
              <p className="text-xs text-gray-500">
                Define las columnas que tendrá la tabla de pedidos de este proveedor (ej: Pzas, Mod, Talla, Color).
              </p>
              <div className="space-y-2">
                {columnsList.map((col, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <LayoutGrid className="text-gray-400 shrink-0" size={16} />
                    <Input
                      type="text"
                      placeholder={`Nombre de columna #${idx + 1}`}
                      value={col}
                      onChange={(e) => handleColumnChange(idx, e.target.value)}
                      className="focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemoveColumn(idx)}
                      disabled={columnsList.length === 1 && col === ''}
                      className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                className="mt-1 w-full text-blue-600 hover:text-blue-700 border-dashed border-blue-300 hover:bg-blue-50"
              >
                + Agregar Columna
              </Button>
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
