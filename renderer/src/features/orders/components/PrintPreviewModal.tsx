import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import notaImage from '@/assets/NOTA.jpg';
import { getOrderItemDisplayName, getOrderItemDescription, getOrderItemType } from '../types';
import { formatDateMX } from '@/utils/dateUtils';
import ClientColorIndicator from '../../clients/components/ClientColorIndicator';
import type { ClientColor } from '../../clients/types';

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

  const itemsPerPage = 5;
  const productChunks: any[][] = [];
  for (let i = 0; i < productsData.length; i += itemsPerPage) {
    productChunks.push(productsData.slice(i, i + itemsPerPage));
  }
  if (productChunks.length === 0) productChunks.push([]);

  const getDay = (dateString: string) => formatDateMX(dateString, 'DD');
  const getMonth = (dateString: string) => formatDateMX(dateString, 'MM');
  const getYear = (dateString: string) => formatDateMX(dateString, 'YYYY');
  const getHours = (dateString: string) => formatDateMX(dateString, 'HH:mm');

  const hasPreferentialPrice = productsData.some(product => {
    const type = getOrderItemType(product);
    const originalPrice = type === 'product'
      ? product.product_price
      : product.template_final_price;

    return originalPrice !== undefined && originalPrice !== null &&
      Math.abs(Number(product.unit_price) - Number(originalPrice)) > 0.01;
  });

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
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = reject;
          img.src = url;
        });
      };

      // Obtener la imagen en base64
      const base64Image = await imageToBase64(notaImage);


      // Generar HTML con el mismo diseño del preview visual
      const pagesHtml = productChunks.map((chunkProducts, index) => {
        const isLastPage = index === productChunks.length - 1;
        const pageBreak = index > 0 ? 'page-break-before: always;' : '';

        return `
    <div class="print-container" style="${pageBreak}">
        ${hasPreferentialPrice ? `
        <!-- Sello de precio especial -->
        <div style="position: absolute; bottom: 4rem; right: 4.8rem; width: 6.5rem; background-color: rgb(220, 38, 38); color: white; font-weight: bold; font-size: 0.55rem; text-align: center; padding: 0.35rem 0.25rem; box-sizing: border-box; z-index: 10; line-height: 1.2;">
          USTED HA ADQUIRIDO UN PRECIO ESPECIAL
        </div>
        ` : ''}

        <!-- Imagen de fondo como elemento IMG en lugar de background-image -->
        <img src="${base64Image}" alt="Fondo" class="background-image" />
        
        <!-- Fechas en dos columnas -->
        <div style="position: absolute; top: 4rem; right: 1rem; font-size: 1rem; line-height: 1.25rem; font-weight: 700; color: rgb(0, 0, 0);">
            <div style="display: flex; min-width: 255px; align-items: flex-start;">
                <div style="text-align: right; width: 115px;">
                    <div style="display: flex; gap: 1rem;">
                        <span>${getDay(orderData.date)}</span>
                        <span>${getMonth(orderData.date)}</span>
                        <span>${getYear(orderData.date)}</span>
                    </div>
                </div>
                ${orderData.estimated_delivery_date ? `
                <div style="text-align: right; width: 100px;">
                    <div style="display: flex; gap: 1.25rem;">
                        <span>${getDay(orderData.estimated_delivery_date)}</span>
                        <span>${getMonth(orderData.estimated_delivery_date)}</span>
                        <span>${getYear(orderData.estimated_delivery_date)}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Hora de la orden -->
        <div style="position: absolute; top: 7.5rem; right: 14.5rem; font-size: 1rem; font-weight: 700; color: rgb(0,0,0);">
            ${getHours(orderData.date)}
        </div>

        <!-- Cliente y Teléfono -->
        <div style="position: absolute; top: 7.5rem; left: 6.25rem; font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5rem;">
                <!-- Cliente -->
            <div style="grid-column: span 1 / span 1; font-size: calc(1em - 2px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 0.5rem;">
                    ${orderData.client?.color ?
            `<div style="width: 1rem; height: 1rem; border-radius: 9999px; background-color: ${orderData.client.color === 'green' ? '#22c55e' :
              orderData.client.color === 'yellow' ? '#eab308' :
                orderData.client.color === 'red' ? '#ef4444' : 'transparent'
            }; flex-shrink: 0;"></div>`
            : ''}
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
            <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; font-size: 1rem; line-height: 1; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid rgb(156, 163, 175); padding-bottom: 0.25rem;">
                <div style="grid-column: span 1 / span 1; text-align: center;">Cant.</div>
                <div style="grid-column: span 7 / span 7; text-align: left;">Producto</div>
                <div style="grid-column: span 2 / span 2; text-align: right;">P. Unitario</div>
                <div style="grid-column: span 2 / span 2; text-align: right;">Total</div>
            </div>
            ${chunkProducts.map((product) => `
                <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; font-size: 1rem; line-height: 1.5rem; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                    <div style="grid-column: span 1 / span 1; text-align: center;">${product.quantity}</div>
                    <div style="grid-column: span 7 / span 7; padding-left: 0.25rem;">
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
                    <div style="grid-column: span 2 / span 2; text-align: right; font-weight: 500;">${product.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style="grid-column: span 2 / span 2; text-align: right; font-weight: 500;">${product.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            `).join('')}
        </div>

        ${isLastPage && orderData.description ? `
        <!-- Descripción de la orden -->
        <div style="position: absolute; bottom: 8.8rem; left: 5rem; right: 3rem; font-size: 1rem; color: rgb(153, 27, 27); font-weight: 700; padding: 0.5rem; border-radius: 0.25rem; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; line-height: 1.2em; max-height: 4.2em;">
            ${orderData.description}
        </div>
        ` : ''}

        <div>
            <!-- Número de Orden en la parte inferior derecha -->
            <div style="position: absolute; bottom: 2.2rem; right: 5rem; font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(220, 38, 38); text-align: center;">
                No. ${orderData.id}
            </div>
        </div>

        <!-- Mensaje de agradecimiento y usuario -->
        <div style="position: absolute; bottom: 6.5rem; left: 12.5rem; font-size: 1rem; line-height: 1; font-weight: 700; color: rgb(3, 105, 161);">
            GRACIAS POR SU COMPRA. LE ATENDIÓ ${orderData.user?.username || ''}
        </div>

        <!-- Método de pago -->
        <div style="position: absolute; bottom: 5.5rem; left: 17.5rem; font-size: 1rem; line-height: 1;">
            ${paymentsData.length > 0 ? `Pago realizado con: ${paymentsData[0]?.descripcion || ''}` : ''}
        </div>
        
        <!-- Pagos -->
        <div style="position: absolute; bottom: 2.75rem; left: 11rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; color: rgb(21, 128, 61); font-weight: 700; font-size: 1.5rem; line-height: 1;">
            ${paymentsData.length > 0 ? `$${totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
        </div>

        <!-- Saldo -->
        <div style="position: absolute; bottom: 2.75rem; left: 20rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; font-weight: 700; color: rgb(220, 38, 38); font-size: 1.5rem; line-height: 1;">
            $${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <!-- Total -->
        <div style="position: absolute; bottom: 2.75rem; left: 29rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; color: rgb(0, 0, 0); font-weight: 700; font-size: 1.5rem; line-height: 1;">
            $${orderData.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
    </div>
        `;
      }).join('');

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
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            .print-container {
                width: 21.6cm !important;
                height: 17cm !important;
                position: relative !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
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
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        .print-container {
            width: 21.6cm;
            height: 17cm;
            position: relative;
            overflow: hidden;
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
    ${pagesHtml}
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
    <div className="fixed inset-0 flex items-center justify-center z-60"
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
          <div className="flex flex-col items-center gap-8">
            {productChunks.map((chunkProducts, index) => {
              const isLastPage = index === productChunks.length - 1;
              return (
                <div key={index} className="flex justify-center">
                  <div
                    className="relative border border-gray-300 shadow-lg bg-cover bg-center bg-no-repeat"
                    style={{
                      width: '800px', // Tamaño fijo para preview
                      height: '662px', // Mantiene proporción 1600:1324
                      backgroundImage: `url(${notaImage})`
                    }}
                  >
                    {hasPreferentialPrice && (
                      <div
                        className="absolute bottom-20 right-18 w-26 bg-red-600 text-white font-bold text-center p-1.5 select-none"
                        style={{ zIndex: 10, fontSize: '0.65rem', lineHeight: '1.2' }}
                      >
                        USTED HA ADQUIRIDO UN PRECIO ESPECIAL
                      </div>
                    )}
                    {/* Fechas en dos columnas */}
                    <div className="absolute top-18 right-1 text-sm font-bold text-black">
                      <div className="flex items-start" style={{ minWidth: '255px' }}>
                        <div className="text-right" style={{ width: '110px' }}>
                          <div className="flex gap-4">
                            <span>{getDay(orderData.date)}</span>
                            <span>{getMonth(orderData.date)}</span>
                            <span>{getYear(orderData.date)}</span>
                          </div>
                        </div>
                        {orderData.estimated_delivery_date && (
                          <div className="text-right" style={{ width: '100px' }}>
                            <div className="flex gap-5">
                              <span>{getDay(orderData.estimated_delivery_date)}</span>
                              <span>{getMonth(orderData.estimated_delivery_date)}</span>
                              <span>{getYear(orderData.estimated_delivery_date)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='absolute top-32 right-55'>
                      {getHours(orderData.date)}
                    </div>

                    <div className='absolute top-32 left-25 text-xl font-bold text-black'>
                      <div className="grid grid-cols-2 gap-20">
                        {/* Cliente */}
                        <div className="truncate flex items-center gap-2" style={{ fontSize: 'calc(1em - 2px)' }}>
                          {orderData.client?.color && (
                            <ClientColorIndicator color={orderData.client.color as ClientColor} size="md" />
                          )}
                          <span>{orderData.client?.name || 'Cliente no especificado'}</span>
                        </div>

                        {/* Numero de telefono */}
                        <div className='ml-39'>
                          {orderData.client?.phone || ''}
                        </div>
                      </div>
                    </div>

                    {/* Productos en formato de tabla */}
                    <div className="absolute top-38 left-8 right-10 text-black">
                      <div className="grid grid-cols-12 gap-2 text-lg font-semibold mb-2 border-b border-gray-400 pb-1">
                        <div className="col-span-1 text-center">Cant.</div>
                        <div className="col-span-7 text-left">Producto</div>
                        <div className="col-span-2 text-right">P. Unitario</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>
                      {chunkProducts.map((product, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-2 mb-2 text-base py-1"
                        >
                          <div className="col-span-1 text-center">
                            {product.quantity}
                          </div>
                          <div className="col-span-7 pl-1">
                            <div className="font-medium">{getOrderItemDisplayName(product)}</div>
                            {getOrderItemDescription(product) && (
                              <div className="text-sm text-gray-700 -mt-2 leading-tight">
                                {getOrderItemDescription(product)}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 text-right font-medium">
                            ${product.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-2 text-right font-medium">
                            ${product.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {isLastPage && orderData.description && (
                      <div className="absolute bottom-37 left-20 right-10 text-sm text-red-800 p-2 rounded">
                        <div className="line-clamp-4 break-words">
                          {orderData.description}
                        </div>
                      </div>
                    )}


                    <div className="absolute bottom-13 right-20 text-xl font-bold text-red-600">
                      <div className='text-center'>
                        No. {orderData.id}
                      </div>
                    </div>

                    <div className='absolute bottom-29 left-50'>
                      <div className='text-blue-900 font-bold'>
                        GRACIAS POR SU COMPRA. LE ATENDIÓ {orderData.user?.username || ''}
                      </div>
                    </div>

                    <div className='absolute bottom-25 left-70'>
                      <div className=''>
                        {paymentsData.length > 0 ? `Pago realizado con: ${paymentsData[0]?.descripcion || ''}` : ''}
                        {/* {paymentsData[0]?.descripcion || ''} */}
                      </div>
                    </div>

                    {/* Pagos */}
                    <div className="absolute bottom-14 left-43 w-32 h-8 flex items-center justify-center text-green-700 font-bold text-xl">
                      {paymentsData.length > 0 ? `$${totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                    </div>

                    {/* Saldo */}
                    <div className="absolute bottom-14 left-79 w-32 h-8 flex items-center justify-center text-red-600 font-bold text-xl">
                      ${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {/* Total */}
                    <div className="absolute bottom-14 left-113 w-32 h-8 flex items-center justify-center text-black font-bold text-xl">
                      ${orderData.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;