import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import cotizacionImage from '@/assets/COTIZACION.jpg';

interface BudgetPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetData: {
    client_name: string;
    client_phone: string;
    date: string;
    total: number;
    notes?: string;
    items: any[];
  };
}

export const BudgetPrintPreviewModal: React.FC<BudgetPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  budgetData
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !budgetData) return null;

  // Funciones para obtener componentes de fecha por separado
  const getDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate().toString().padStart(1, '0');
  };

  const getMonth = (dateString: string) => {
    const date = new Date(dateString);
    return (date.getMonth() + 1).toString().padStart(1, '0');
  };

  const getYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  };

  const handlePrint = () => {
    setIsLoading(true);

    try {
      // Generar HTML sin fondo para impresión
      const printHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presupuesto - ${budgetData.client_name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @page {
            size: 2102px 2368px portrait;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        @media print {
            html, body {
                width: 2102px !important;
                height: 2368px !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                transform-origin: top left;
                -webkit-transform-origin: top left;
            }
            .print-container {
                width: 2102px !important;
                height: 2368px !important;
                position: relative !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
            }
        }
        body {
            width: 2102px;
            height: 2368px;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        .print-fechas {
            top: 572px;
            right: 263px;
        }
        .print-cliente-telefono {
            top: 858px;
            left: 263px;
        }
        .print-productos {
            top: 1287px;
            left: 105px;
            right: 105px;
        }
        .print-totales {
            bottom: 358px;
            right: 263px;
        }
    </style>
</head>
<body class="text-black font-sans text-xs leading-normal w-full h-full m-0 p-0">
    <div class="print-container relative w-full h-full p-0 m-0">
        <!-- Fechas -->
        <div class="absolute print-fechas text-6xl font-bold">
            <div class="text-right">
                <div class="flex gap-10">
                    <span>${getDay(budgetData.date)}</span>
                    <span>${getMonth(budgetData.date)}</span>
                    <span>${getYear(budgetData.date)}</span>
                </div>
            </div>
        </div>

        <!-- Cliente y Teléfono -->
        <div class="absolute print-cliente-telefono text-7xl font-bold">
            <div class="grid grid-cols-2 gap-42">
                <!-- Cliente -->
                <div>
                    ${budgetData.client_name || 'Cliente no especificado'}
                </div>
                
                <!-- Teléfono -->
                <div className='ml-50'>
                    ${budgetData.client_phone || ''}
                </div>
            </div>
        </div>
        
        <!-- Productos en formato de tabla -->
        <div class="absolute print-productos">
            <div class="grid grid-cols-12 gap-5 text-6xl font-bold mb-10 border-b-2 border-black pb-5">
                <div class="col-span-1 text-center">#</div>
                <div class="col-span-6">Producto</div>
                <div class="col-span-2 text-center">Cantidad</div>
                <div class="col-span-3 text-right">Precio</div>
            </div>
            ${budgetData.items.map((item, index) => `
                <div class="grid grid-cols-12 gap-5 mb-5 text-4xl py-3">
                    <div class="col-span-1 text-center font-bold">${index + 1}</div>
                    <div class="col-span-6">${item.name || 'Producto'}</div>
                    <div class="col-span-2 text-center">${item.quantity}</div>
                    <div class="col-span-3 text-right font-bold">${(item.quantity * item.unit_price).toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
        
        <!-- Total -->
        <div class="absolute print-totales text-7xl font-bold text-black">
            ${budgetData.total.toFixed(2)}
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
          
          // Configurar las opciones de impresión antes de abrir el diálogo
          const style = printWindow.document.createElement('style');
          style.textContent = `
            @media print {
              @page {
                size: 2102px 2368px portrait !important;
                margin: 0 !important;
              }
              body {
                transform: none !important;
                width: 2102px !important;
                height: 2368px !important;
              }
            }
          `;
          printWindow.document.head.appendChild(style);
          
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

              {/* Cliente y Teléfono */}
              <div className='absolute top-29 left-25 text-xl font-bold text-black'>
                <div className="grid grid-cols-3 gap-20">
                  {/* Cliente */}
                  <div>
                    {budgetData.client_name || 'Cliente no especificado'}
                  </div>
                  
                  {/* Numero de telefono */}
                  <div className='ml-28'>
                    {budgetData.client_phone || ''}
                  </div>

                  {/* Fechas */}
                  <div className="ml-10">
                    {budgetData.date}
                  </div>

                </div>
              </div>

              {/* Productos en formato de tabla */}
              <div className="absolute top-40 left-8 right-10 text-black">
                <div className="grid grid-cols-12 gap-2 text-lg font-semibold mb-2 border-b border-gray-400 pb-1">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-3 text-right">Precio</div>
                </div>
                {budgetData.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 mb-2 text-lg py-1"
                  >
                    <div className="col-span-1 text-center font-medium">
                      {index + 1}
                    </div>
                    <div className="col-span-6">
                      {item.name || 'Producto'}
                    </div>
                    <div className="col-span-2 text-center">
                      {item.quantity}
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      ${(item.quantity * item.unit_price).toFixed(2)}
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
