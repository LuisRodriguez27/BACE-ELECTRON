import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import cotizacionImage from '@/assets/COTIZACION.jpg';
import type { Budget } from '../types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface BudgetPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: Budget;
}

export const BudgetPrintPreviewModal: React.FC<BudgetPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  budgetData
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !budgetData) return null;

  // Función para formatear fecha como DD/MM/YYYY
  const formatDate = (dateString: string) => {
    let date = dayjs(dateString);

    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }
    
    const day = date.date().toString().padStart(2, '0');
    const month = (date.month() + 1).toString().padStart(2, '0');
    const year = date.year().toString();
    return `${day}/${month}/${year}`;
  };

  const handlePrint = async () => {
    setIsLoading(true);

    try {
      // Convertir imagen a base64 para que funcione en la ventana de impresión
      const imageToBase64 = async (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          img.onerror = reject;
          img.src = url;
        });
      };

      // Obtener la imagen en base64
      const base64Image = await imageToBase64(cotizacionImage);

      // Generar HTML con el mismo diseño del preview visual
      const printHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presupuesto - ${budgetData.client?.name}</title>
    <style>
    :root {
      /* Ajusta este valor para subir/bajar el contenido en la impresión. Acepta unidades como mm, cm, px */
      --print-offset: -5mm;
    }
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            font-family: Arial, sans-serif !important;
        }
        @page {
            size: 21.6cm 18.5cm landscape;
            margin: 0;
        }
        @media print {
            html, body {
                width: 21.6cm !important;
                height: 18.5cm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
            }
            .print-container {
        width: 21.6cm !important;
        height: 18.5cm !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
        /* Usar transform en lugar de margin-top negativo evita problemas de recorte y comportamiento variable en impresoras */
        transform: translateY(var(--print-offset)) !important;
            }
            .background-image {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                z-index: -1 !important;
            }
        }
        body {
            width: 21.6cm;
            height: 18.5cm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        .print-container {
      width: 21.6cm;
      height: 18.5cm;
      position: relative;
      /* Aplicar offset también para la vista previa en navegador si quieres que se vea igual */
      transform: translateY(var(--print-offset));
        }
        .background-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: -1;
        }
    </style>
</head>
<body>
    <div class="print-container">
        <!-- Imagen de fondo como elemento IMG en lugar de background-image -->
        <img src="${base64Image}" alt="Fondo" class="background-image" />
        
        <!-- ID del presupuesto -->
        <div style="position: absolute; top: 4.25rem; right: 7rem; font-size: 1.5rem; line-height: 2rem; font-weight: 700; color: rgb(220, 38, 38);">
            ${budgetData.id}
        </div>

    <!-- Cliente, Teléfono y Fecha -->
    <div style="position: absolute; top: 8.5rem; left: 6.25rem; font-size: 1rem; line-height: 1.5rem; font-weight: 700; color: rgb(0, 0, 0);">
      <!-- Use fixed column widths to avoid shifting when name is short -->
      <div style="display: grid; grid-template-columns: 17rem 8rem 1rem; column-gap: 5.5rem; align-items: center;">
        <!-- Cliente -->
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: calc(1em - 2px);">
          ${budgetData.client?.name || 'Cliente no especificado'}
        </div>

        <!-- Teléfono -->
        <div style="text-align: center;">
          ${budgetData.client?.phone || ''}
        </div>

        <!-- Fecha -->
        <div style="text-align: left;">
          ${formatDate(budgetData.date)}
        </div>
      </div>
    </div>

        <!-- Productos en formato de tabla -->
        <div style="position: absolute; top: 10rem; left: 2rem; right: 2.5rem; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid rgb(156, 163, 175); padding-bottom: 0.25rem;">
                <div style="grid-column: span 1 / span 1; text-align: center;">#</div>
                <div style="grid-column: span 6 / span 6;">Producto</div>
                <div style="grid-column: span 2 / span 2; text-align: center;">Cantidad</div>
                <div style="grid-column: span 3 / span 3; text-align: right;">Precio</div>
            </div>
            ${budgetData.budgetProducts?.map((item, index) => `
                <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; font-size: 1.125rem; line-height: 1.75rem; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                    <div style="grid-column: span 1 / span 1; text-align: center; font-weight: 500;">
                        ${index + 1}
                    </div>
                    <div style="grid-column: span 6 / span 6;">
                        ${item.product_name || 'Producto'}
                    </div>
                    <div style="grid-column: span 2 / span 2; text-align: center;">
                        ${item.quantity}
                    </div>
                    <div style="grid-column: span 3 / span 3; text-align: right; font-weight: 500;">
                        $${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        toast.error('No se pudo abrir la ventana de impresión.');
        return;
      }

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Configurar impresión automática
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        }, 500);
      };

      toast.success('Documento enviado a impresión');

    } catch (error) {
      console.error('Error al imprimir:', error);
      toast.error('Error al generar el documento de impresión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Printer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Vista Previa - Presupuesto
              </h2>
              <p className="text-sm text-gray-500">
                Verifica los datos antes de imprimir
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Printer size={16} />
              {isLoading ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-6 overflow-auto max-h-[calc(95vh-100px)]">
          <div className="flex justify-center">
            <div
              className="relative border border-gray-300 shadow-lg bg-cover bg-center bg-no-repeat"
              style={{
                width: '800px',
                height: '662px',
                backgroundImage: `url(${cotizacionImage})`
              }}
            >

              <div className='absolute top-13 right-28 text-2xl font-bold text-red-600'>
                {budgetData.id}
              </div>

              {/* Cliente y Teléfono */}
              <div className='absolute top-30 left-25 text-l font-bold text-black'>
                {/* fixed columns to prevent shifting */}
                <div style={{ display: 'grid', gridTemplateColumns: '17rem 8rem 1rem', columnGap: '5rem', alignItems: 'center' }}>
                  {/* Cliente */}
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', fontSize: 'calc(1em - 2px)' }}>
                    {budgetData.client?.name || 'Cliente no especificado'}
                  </div>

                  {/* Numero de telefono */}
                  <div style={{ textAlign: 'center' }}>
                    {budgetData.client?.phone || ''}
                  </div>

                  {/* Fechas */}
                  <div style={{ textAlign: 'center' }}>
                    {formatDate(budgetData.date)}
                  </div>

                </div>
              </div>

              {/* Productos en formato de tabla */}
              <div className="absolute top-36 left-8 right-10 text-black">
                <div className="grid grid-cols-12 gap-2 text-lg font-semibold mb-2 border-b border-gray-400 pb-1">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-3 text-right">Precio</div>
                </div>
                {budgetData.budgetProducts?.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 mb-2 text-lg py-1"
                  >
                    <div className="col-span-1 text-center font-medium">
                      {index + 1}
                    </div>
                    <div className="col-span-6">
                      {item.product_name || 'Producto'}
                    </div>
                    <div className="col-span-2 text-center">
                      {item.quantity}
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      ${item.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPrintPreviewModal;
