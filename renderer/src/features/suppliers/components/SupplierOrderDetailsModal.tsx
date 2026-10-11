import React, { useRef } from 'react';
import { X, Calendar, FileText, User, Link, Printer, Image, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Supplier, SupplierOrder } from '../types';
import { calculateOrderTotalPieces } from '../utils';
import { formatDateMX } from '@/utils/dateUtils';
import html2canvas from 'html2canvas';
import { sanitizeOklchOnClone } from '@/utils/canvasUtils';
import { toast } from 'sonner';

interface SupplierOrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SupplierOrder | null;
  suppliers: Supplier[];
}

const getProgressStyles = (status: string | null) => {
  const s = String(status).toLowerCase();
  if (s === 'cancelado') {
    return {
      percent: 0,
      colorClass: 'bg-gray-400',
      badgeClass: 'bg-gray-50 text-gray-500 border-gray-200',
      label: 'Cancelado'
    };
  }
  if (s === 'pagado') {
    return {
      percent: 100,
      colorClass: 'bg-green-500',
      badgeClass: 'bg-green-50 text-green-700 border-green-200',
      label: 'Pagado'
    };
  }
  // Default to 'pendiente'
  return {
    percent: 50,
    colorClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Pendiente'
  };
};

const SupplierOrderDetailsModal: React.FC<SupplierOrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  suppliers
}) => {
  if (!isOpen || !order) return null;

  const exportRef = useRef<HTMLDivElement>(null);
  const statusInfo = getProgressStyles(order.status);

  const selectedSupplier = suppliers.find(s => s.id === order.supplier_id);
  const columns = selectedSupplier?.columns && selectedSupplier.columns.length > 0
    ? selectedSupplier.columns
    : ['pzas', 'descripción'];

  // Normalize order items
  const items = (order.supplierOrderItems || []).map((i: any) => {
    if (i && i.item_data) return i.item_data;
    return i;
  });

  const totalPieces = calculateOrderTotalPieces(order, suppliers);

  const handleSaveImage = async () => {
    if (!exportRef.current || !order) return;
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // crisp quality
        logging: false,
        useCORS: true,
        onclone: sanitizeOklchOnClone
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pedido-proveedor-${order.id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Imagen guardada exitosamente');
    } catch (err) {
      console.error('Error al guardar la imagen:', err);
      toast.error('Error al generar la imagen');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!exportRef.current || !order) return;
    try {
      toast.loading('Generando imagen del pedido...', { id: 'whatsapp-supplier-status' });
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        onclone: sanitizeOklchOnClone
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('No se pudo generar la imagen PNG'));
        }, 'image/png', 1.0);
      });

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('Imagen copiada. ¡Pégala en WhatsApp con Ctrl+V!', { id: 'whatsapp-supplier-status' });
      } catch (clipErr) {
        console.error('Error writing to clipboard:', clipErr);
        toast.error('No se pudo copiar la imagen al portapapeles automáticamente.', { id: 'whatsapp-supplier-status' });
      }

      // Open WhatsApp Web
      const rawPhone = (order.supplier_phone || '').replace(/\D/g, '');
      const phoneWithCountry = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

      let whatsappUrl: string;
      if (phoneWithCountry) {
        whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneWithCountry}`;
      } else {
        whatsappUrl = `https://web.whatsapp.com/`;
        toast.warning('El proveedor no tiene número registrado. Abre WhatsApp y selecciona el chat manualmente.', { id: 'whatsapp-supplier-status' });
      }

      await window.api.openExternal(whatsappUrl);
    } catch (err) {
      console.error('Error al enviar por WhatsApp:', err);
      toast.error('Ocurrió un error al preparar el envío por WhatsApp.', { id: 'whatsapp-supplier-status' });
    }
  };

  const handlePrintTable = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor permite ventanas emergentes para imprimir');
        return;
      }

      const tableRows = items.map((item) => {
        const cells = columns.map((col) => {
          const val = item[col] !== undefined && item[col] !== null ? String(item[col]) : '-';
          return `<td>${val}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const tableHeaders = columns.map((col) => {
        return `<th>${col.toUpperCase()}</th>`;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pedido a Proveedor #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; font-size: 14px; color: #333; }
            h1 { font-size: 20px; font-weight: bold; margin-bottom: 2px; }
            .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #444; }
            tr:nth-child(even) { background-color: #fafafa; }
            
            @media print {
              body { margin: 1cm; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Pedido a Proveedor</h1>
          <div class="meta">
            <strong>ID Pedido:</strong> #${order.id} | 
            <strong>Fecha:</strong> ${formatDateMX(order.date, 'DD/MM/YYYY, h:mm A')}
            ${order.order_id ? ` | <strong>Orden de Cliente Vinculada:</strong> #${order.order_id}` : ''}
            ${order.username ? ` | <strong>Generado por:</strong> ${order.username}` : ''}
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Error al imprimir tabla de pedido:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detalles del Pedido #{order.id}</h2>
              <p className="text-sm text-gray-500">Información detallada del pedido al proveedor</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Info */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <User size={14} /> Proveedor
              </div>
              <h3 className="font-bold text-gray-900">{order.supplier_name || 'Desconocido'}</h3>
              <p className="text-xs text-gray-500">ID Proveedor: #{order.supplier_id}</p>
            </div>

            {/* Order Date & Status */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Calendar size={14} /> Información de Pedido
              </div>
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-500">Fecha:</span> {formatDateMX(order.date, 'DD/MM/YYYY, h:mm A')}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium text-gray-500">Generado por:</span> {order.username || <span className="text-gray-400 italic text-xs">Desconocido</span>}
              </p>
              {order.total !== undefined && order.total !== null && order.total > 0 && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium text-gray-500">Total:</span> <span className="font-bold text-slate-900">${order.total.toFixed(2)}</span>
                </p>
              )}
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-medium text-gray-500">Estado:</span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-bold uppercase rounded border ${statusInfo.badgeClass}`}>
                    {statusInfo.label}
                  </span>
                </div>
                {String(order.status).toLowerCase() !== 'cancelado' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${statusInfo.colorClass}`} style={{ width: `${statusInfo.percent}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            {/* Linkage Info */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Link size={14} /> Vinculación
              </div>
              {order.order_id ? (
                <div>
                  <p className="text-sm text-blue-600 font-bold">
                    Pedido de Cliente #{order.order_id}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta orden está vinculada a un pedido de cliente para surtido.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No vinculado a ningún pedido de cliente</p>
              )}
            </div>
          </div>

          {/* Export Wrapper (Table + Header details for screenshot) */}
          <div ref={exportRef} className="bg-white p-6 rounded-lg border border-gray-200 space-y-4 shadow-sm">
            {/* Header info specifically formatted for the image/pdf export */}
            <div className="border-b border-gray-100 pb-3 flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-gray-950">Pedido a Proveedor</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Proveedor: <span className="font-semibold text-gray-800">{order.supplier_name || 'Desconocido'}</span>
                </p>
                {order.username && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generado por: <span className="font-semibold text-gray-800">{order.username}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">Pedido #{order.id}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Fecha: {formatDateMX(order.date, 'DD/MM/YYYY, h:mm A')}
                </p>
                {order.total !== undefined && order.total !== null && order.total > 0 && (
                  <p className="text-sm font-bold text-blue-600 mt-1">
                    Total: ${(order.total).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded border border-gray-200">
                <strong>Notas:</strong> {order.notes}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Artículos Solicitados ({totalPieces})</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {items.map((item, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50/50">
                        {columns.map((col) => (
                          <td key={col} className="px-4 py-2.5 text-sm text-gray-700 font-medium">
                            {item[col] !== undefined && item[col] !== null ? String(item[col]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintTable}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Printer size={16} />
              Imprimir / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveImage}
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Image size={16} />
              Guardar Imagen
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
            >
              <MessageCircle size={16} className="text-green-600" />
              Enviar por WhatsApp
            </Button>
          </div>
          <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            Cerrar Detalles
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupplierOrderDetailsModal;
