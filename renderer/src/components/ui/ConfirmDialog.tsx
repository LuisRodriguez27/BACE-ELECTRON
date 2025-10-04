import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white ${getButtonColor()}`}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
