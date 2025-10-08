import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductTemplatesApiService } from '../ProductTemplatesApiService';
import type { ProductTemplate } from '../types';

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateDeleted: (templateId: number) => void;
  template: ProductTemplate | null;
}

const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateDeleted,
  template
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!template) return;

    try {
      setIsDeleting(true);
      setError(null);

      await ProductTemplatesApiService.delete(template.id);
      onTemplateDeleted(template.id);
      onClose();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Error al eliminar la plantilla. Intenta nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !template) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Plantilla</h2>
              <p className="text-sm text-gray-500">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Template Details */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {template.description || 'Sin descripción'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package size={14} />
                      <span>{template.product_name}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Precio Final</p>
                    <p className="text-sm font-medium text-gray-900">
                      ${template.final_price.toFixed(2)} MXN
                    </p>
                  </div>
                  {(template.width || template.height) && (
                    <div>
                      <p className="text-xs text-gray-500">Dimensiones</p>
                      <p className="text-sm font-medium text-gray-900">
                        {template.width && template.height
                          ? `${template.width}m × ${template.height}m`
                          : template.width 
                            ? `${template.width}m ancho`
                            : `${template.height}m alto`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Warning Text */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">
                    ¿Estás seguro de que quieres eliminar esta plantilla?
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Esta acción eliminará permanentemente la plantilla. 
                    No podrás recuperar estos datos después de la eliminación.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Eliminar Plantilla
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteTemplateModal;
