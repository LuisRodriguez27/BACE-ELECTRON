import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import notaImage from '@/assets/NOTA.jpg';
import paidStampImage from '@/assets/SELLO-PAGADO.png';
import { getOrderItemDisplayName, getOrderItemDescription, getOrderItemType } from '../types';
import { formatDateMX, formatDateOnlyMX } from '@/utils/dateUtils';
import ClientColorIndicator from '../../clients/components/ClientColorIndicator';
import type { ClientColor } from '../../clients/types';
import { prepareOrderHtml, buildPrintHtml } from '../utils/buildOrderPageHtml';

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
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !orderData) return null;

  const itemsPerPage = 5;
  const productChunks: any[][] = [];
  for (let i = 0; i < productsData.length; i += itemsPerPage) {
    productChunks.push(productsData.slice(i, i + itemsPerPage));
  }
  if (productChunks.length === 0) productChunks.push([]);

  const getDay    = (dateString: string) => formatDateMX(dateString, 'DD');
  const getMonth  = (dateString: string) => formatDateMX(dateString, 'MM');
  const getYear   = (dateString: string) => formatDateMX(dateString, 'YYYY');
  const getHours  = (dateString: string) => formatDateMX(dateString, 'HH:mm');
  // Para estimated_delivery_date (UTC midnight) – no aplicar offset de timezone
  const getDayUTC   = (dateString: string) => formatDateOnlyMX(dateString, 'DD');
  const getMonthUTC = (dateString: string) => formatDateOnlyMX(dateString, 'MM');
  const getYearUTC  = (dateString: string) => formatDateOnlyMX(dateString, 'YYYY');

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
  const isSaldada = saldoPendiente <= 0.01;

  const handlePrint = async () => {
    setIsLoading(true);
    try {
      const { pagesHtml } = await prepareOrderHtml(
        orderData, productsData, paymentsData, notaImage, paidStampImage
      );
      const printHTML = buildPrintHtml({ orderId: orderData.id, pagesHtml });

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('No se pudo abrir la ventana de impresión.');
        return;
      }
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => { printWindow.close(); };
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
          <div ref={previewRef} className="flex flex-col items-center gap-8">
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
                    {isSaldada && (
                      <img
                        src={paidStampImage}
                        alt="Saldada"
                        className="absolute top-120 right-10"
                        style={{ width: '7rem', height: 'auto', zIndex: 10, opacity: 0.9, transform: 'rotate(15deg)' }}
                      />
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
                              <span>{getDayUTC(orderData.estimated_delivery_date)}</span>
                              <span>{getMonthUTC(orderData.estimated_delivery_date)}</span>
                              <span>{getYearUTC(orderData.estimated_delivery_date)}</span>
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