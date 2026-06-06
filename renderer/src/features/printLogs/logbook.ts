import { formatDateMX, formatDateHeaderMX } from '@/utils/dateUtils';
import type { PrintLog } from './types';

export const generatePrintLogbookHtml = (logsToPrint: PrintLog[], dateStr: string): string => {
  const formattedDate = formatDateHeaderMX(dateStr);
  
  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bitácora de Impresiones - ${formattedDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
        p.date { text-align: center; margin-top: 0; margin-bottom: 15px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
        .center { text-align: center; }
        .check-col { width: 40px; text-align: center; }
        .responsable-col { width: 40px; text-align: center; }
        
        /* Background Colors for Status */
        .bg-pendiente { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .bg-en-proceso { background-color: #dbeafe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .bg-realizado { background-color: #d1fae5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        /* Status Checks */
        .checkmark { font-size: 14px; font-weight: bold; }
        
        /* Print optimizations */
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { margin: 0; }
          tr { break-inside: avoid; }
          td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>BITÁCORA DE IMPRESIONES - BACE</h1>
      <p class="date">${formattedDate}</p>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width: 40px;">ID</th>
            <th rowspan="2" style="width: 50px;">Orden</th>
            <th rowspan="2">Descripción</th>
            <th rowspan="2" style="width: 70px;">Hora Ent.</th>
            <th colspan="2" style="width: 80px;">Responsable</th>
            <th rowspan="2" style="width: 70px;">Estado</th>
            <th rowspan="2" style="width: 100px;">Envío</th>
            <th rowspan="2" style="width: 70px;">Pago</th>
            <th rowspan="2" style="width: 50px;">Listo</th>
            <th rowspan="2" style="width: 150px;">Observaciones</th>
          </tr>
          <tr>
            <th class="responsable-col">MOS</th>
            <th class="responsable-col">MAQ</th>
          </tr>
        </thead>
        <tbody>
          ${logsToPrint.length === 0 ? '<tr><td colspan="11" class="center">No hay impresiones registradas</td></tr>' : ''}
          ${logsToPrint.map(log => {
            const timeStr = formatDateMX(log.hora_entrega, 'hh:mm A');
            
            // Status classes
            let statusClass = '';
            if (log.status === 'Pendiente') statusClass = 'bg-pendiente';
            else if (log.status === 'En Proceso') statusClass = 'bg-en-proceso';
            else if (log.status === 'Realizado') statusClass = 'bg-realizado';

            const isMostrador = log.responsable === 'most';
            const isMaquila = log.responsable === 'maq';

            return `
              <tr>
                <td class="center"><strong>${log.id}</strong></td>
                <td class="center">${log.order_id ? `#${log.order_id}` : '-'}</td>
                <td>
                  ${log.descripcion}
                  ${log.client_name ? `<br><small style="color: #666; font-size: 9px;">Cliente: ${log.client_name}</small>` : ''}
                </td>
                <td class="center">${timeStr}</td>
                <td class="center">${isMostrador ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center">${isMaquila ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center ${statusClass}">${log.status}</td>
                <td>${log.envio}</td>
                <td class="center">${formatCurrency(log.pago)}</td>
                <td class="center">${log.completado ? '<span class="checkmark">✓</span>' : ''}</td>
                <td>${log.observaciones || ''}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <script>
        window.onload = function() { 
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `;
};

