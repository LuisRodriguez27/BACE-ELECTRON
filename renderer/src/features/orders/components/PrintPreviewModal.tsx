import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import notaImage from '@/assets/NOTA.jpg';
import { getOrderItemDisplayName, getOrderItemDescription } from '../types'; import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: any;
  productsData: any[];
  paymentsData: any[];
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  orderData,
  productsData,
  paymentsData
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !orderData) return null;

  // Funciones para obtener componentes de fecha por separado
  const getDay = (dateString: string) => {
    let date = dayjs(dateString);

    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }

    return date.date().toString().padStart(1, '0');
  };

  const getMonth = (dateString: string) => {
    let date = dayjs(dateString);

    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }


    return (date.month() + 1).toString().padStart(1, '0');
  };

  const getYear = (dateString: string) => {
    let date = dayjs(dateString);

    if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
      date = date.add(1, 'day');
    }

    return date.year().toString();
  };

  const totalPagos = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
  const saldoPendiente = orderData.total - totalPagos;

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
      const base64Image = await imageToBase64(notaImage);

      // Generar HTML con el mismo diseño del preview visual
      const printHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden #${orderData.id}</title>
    <style>
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            font-family: Arial, sans-serif !important;
        }
        @page {
            size: 21.6cm 17cm landscape;
            margin: 0;
        }
        @media print {
            html, body {
                width: 21.6cm !important;
                height: 17cm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
            }
            .print-container {
                width: 21.6cm !important;
                height: 17cm !important;
                position: relative !important;
                margin: 0 !important;
                padding: 0 !important;
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
            height: 17cm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        .print-container {
            width: 21.6cm;
            height: 17cm;
            position: relative;
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
        
        <!-- Fechas en dos columnas -->
        <div style="position: absolute; top: 4rem; right: 3rem; font-size: 1rem; line-height: 1.25rem; font-weight: 700; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem;">
                <!-- Columna 1: Fecha de Orden -->
                <div style="text-align: right;">
                    <div style="display: flex; gap: 1.1rem;">
                        <span>${getDay(orderData.date)}</span>
                        <span>${getMonth(orderData.date)}</span>
                        <span>${getYear(orderData.date)}</span>
                    </div>
                </div>
                
                <!-- Columna 2: Fecha de Entrega -->
                <div style="text-align: right;">
                    ${orderData.estimated_delivery_date ? `
                        <div style="display: flex; gap: 1.1rem;">
                            <span>${getDay(orderData.estimated_delivery_date)}</span>
                            <span>${getMonth(orderData.estimated_delivery_date)}</span>
                            <span>${getYear(orderData.estimated_delivery_date)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Cliente y Teléfono -->
        <div style="position: absolute; top: 7.5rem; left: 6.25rem; font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5rem;">
                <!-- Cliente -->
                <div style="grid-column: span 1 / span 1;">
                    ${orderData.client?.name || 'Cliente no especificado'}
                </div>
                
                <!-- Teléfono -->
                <div style="grid-column: span 1 / span 1; margin-left: 10.5rem;">
                    ${orderData.client?.phone || ''}
                </div>
            </div>
        </div>
        
        <!-- Productos en formato de tabla -->
        <div style="position: absolute; top: 9rem; left: 2rem; right: 2.5rem; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; font-size: 1.125rem; line-height: 1; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid rgb(156, 163, 175); padding-bottom: 0.25rem;">
                <div style="grid-column: span 1 / span 1; text-align: center;">#</div>
                <div style="grid-column: span 6 / span 6;">Producto</div>
                <div style="grid-column: span 2 / span 2; text-align: center;">Cantidad</div>
                <div style="grid-column: span 3 / span 3; text-align: right;">Precio</div>
            </div>
            ${productsData.map((product, index) => `
                <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; font-size: 1.125rem; line-height: 1.75rem; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                    <div style="grid-column: span 1 / span 1; text-align: center; font-weight: 500;">${index + 1}</div>
                    <div style="grid-column: span 6 / span 6;">
                        <div style="font-weight: 500;">
                          ${getOrderItemDisplayName(product)}
                        </div>
                        <div>
                          ${getOrderItemDescription(product) ?
          `<div style="font-size: 0.875rem; color: rgb(70, 80, 90); margin-top: -0.2rem; line-height: 1;">
                              ${getOrderItemDescription(product)}
                            </div>` : ''}
                        </div>
                    </div>
                    <div style="grid-column: span 2 / span 2; text-align: center;">${product.quantity}</div>
                    <div style="grid-column: span 3 / span 3; text-align: right; font-weight: 500;">${product.total_price.toFixed(2)}</div>
                </div>
            `).join('')}
        </div>

        <div>
            <!-- Número de Orden en la parte inferior derecha -->
            <div style="position: absolute; bottom: 7.5rem; right: 5rem; font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(220, 38, 38); text-align: center;">
                No. ${orderData.id}
            </div>
        </div>

        <!-- Mensaje de agradecimiento y usuario -->
        <div style="position: absolute; bottom: 5.5rem; left: 12.5rem; font-size: 1rem; line-height: 1; font-weight: 700; color: rgb(3, 105, 161);">
            GRACIAS POR SU COMPRA. LE ATENDIÓ ${orderData.user?.username || ''}
        </div>
        
        <!-- Totales, Pagos y Saldo en tres columnas -->
        <div style="position: absolute; bottom: 3rem; left: 11rem; font-size: 1.5rem; line-height: 1;">
            <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.5rem;">
                <!-- Pagos -->
                <div style="color: rgb(21, 128, 61); font-weight: 700; text-align: right; min-width: 100px;">
                    ${paymentsData.length > 0 ? `$${totalPagos.toFixed(2)}` : ''}
                </div>
                
                <!-- Saldo -->
                <div style="font-weight: 700; color: rgb(220, 38, 38); text-align: right; min-width: 100px;">
                    $${saldoPendiente.toFixed(2)}
                </div>
                
                <!-- Total -->
                <div style="color: rgb(0, 0, 0); font-weight: 700; text-align: right; min-width: 100px;">
                    $${orderData.total.toFixed(2)}
                </div>
            </div>
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
                Vista Previa - Orden #{orderData.id}
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
                width: '800px', // Tamaño fijo para preview
                height: '662px', // Mantiene proporción 1600:1324
                backgroundImage: `url(${notaImage})`
              }}
            >
              {/* Fechas en dos columnas */}
              <div className="absolute top-18 right-11 text-sm font-bold text-black">
                <div className="grid grid-cols-2 gap-2">
                  {/* Columna 1: Fecha de Orden */}
                  <div className="text-right">
                    <div className="flex gap-5">
                      <span>{getDay(orderData.date)}</span>
                      <span>{getMonth(orderData.date)}</span>
                      <span>{getYear(orderData.date)}</span>
                    </div>
                  </div>

                  {/* Columna 2: Fecha de Entrega */}
                  <div className="text-right">
                    {orderData.estimated_delivery_date ? (
                      <>
                        <div className="flex gap-5">
                          <span>{getDay(orderData.estimated_delivery_date)}</span>
                          <span>{getMonth(orderData.estimated_delivery_date)}</span>
                          <span>{getYear(orderData.estimated_delivery_date)}</span>
                        </div>
                      </>
                    ) : ('')}
                  </div>
                </div>
              </div>

              <div className='absolute top-32 left-25 text-xl font-bold text-black'>
                <div className="grid grid-cols-2 gap-20">
                  {/* Cliente */}
                  <div>
                    {orderData.client?.name || 'Cliente no especificado'}
                  </div>

                  {/* Numero de telefono */}
                  <div className='ml-38'>
                    {orderData.client?.phone || ''}
                  </div>
                </div>
              </div>

              {/* Productos en formato de tabla */}
              <div className="absolute top-38 left-8 right-10 text-black">
                <div className="grid grid-cols-12 gap-2 text-lg font-semibold mb-2 border-b border-gray-400 pb-1">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-3 text-right">Precio</div>
                </div>
                {productsData.map((product, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 mb-2 text-lg py-1"
                  >
                    <div className="col-span-1 text-center font-medium">
                      {index + 1}
                    </div>
                    <div className="col-span-6">
                      <div className="font-medium">{getOrderItemDisplayName(product)}</div>
                      {getOrderItemDescription(product) && (
                        <div className="text-sm text-gray-700 -mt-2 leading-tight">
                          {getOrderItemDescription(product)}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      {product.quantity}
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      ${product.total_price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-32 right-20 text-xl font-bold text-red-600">
                <div className='text-center'>
                  No. {orderData.id}
                </div>
              </div>

              <div className='absolute bottom-25 left-50'>
                <div className='text-blue-900 font-bold'>
                  GRACIAS POR SU COMPRA. LE ATENDIÓ {orderData.user?.username || ''}
                </div>
              </div>

              <div className="absolute bottom-14 left-44 text-2xl">
                <div className="grid grid-cols-3 gap-10">
                  {/* Pagos - Columna 1 (siempre presente) */}
                  <div className="text-green-700 font-bold text-right min-w-[100px]">
                    {paymentsData.length > 0 ? `$${totalPagos.toFixed(2)}` : ''}
                  </div>

                  {/* Saldo - Columna 2 (siempre presente) */}
                  <div className="font-bold text-red-600 text-right min-w-[100px]">
                    ${saldoPendiente.toFixed(2)}
                  </div>

                  {/* Total - Columna 3 (siempre presente) */}
                  <div className="text-black font-bold text-right min-w-[100px]">
                    ${orderData.total.toFixed(2)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;