import { formatDateMX, formatDateHeaderMX } from '@/utils/dateUtils';
import type { ProductionLog } from './types';

export const generateProductionLogbookHtml = (logsToPrint: ProductionLog[], dateStr: string): string => {
  const formattedDate = formatDateHeaderMX(dateStr);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bitácora de Producción - ${formattedDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
        p.date { text-align: center; margin-top: 0; margin-bottom: 15px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
        .center { text-align: center; }
        .checkmark { font-size: 14px; font-weight: bold; }
        .responsable-col { width: 45px; text-align: center; }
        
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
      <h1>BITÁCORA DE PRODUCCIÓN - BACE</h1>
      <p class="date">${formattedDate}</p>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width: 40px;">ID</th>
            <th rowspan="2" style="width: 50px;">Orden</th>
            <th rowspan="2">Descripción</th>
            <th rowspan="2" style="width: 60px;">Cantidad</th>
            <th rowspan="2" style="width: 80px;">Entrega</th>
            <th colspan="2" style="width: 90px;">Responsable</th>
            <th rowspan="2" style="width: 90px;">Creado Por</th>
            <th rowspan="2" style="width: 50px;">Listo</th>
          </tr>
          <tr>
            <th class="responsable-col">MOS</th>
            <th class="responsable-col">MAQ</th>
          </tr>
        </thead>
        <tbody>
          ${logsToPrint.length === 0 ? '<tr><td colspan="9" class="center">No hay registros de producción</td></tr>' : ''}
          ${logsToPrint.map(log => {
            const deliveryTimeStr = formatDateMX(log.delivery_at, 'hh:mm A');
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
                <td class="center">${log.cantidad}</td>
                <td class="center">${deliveryTimeStr}</td>
                <td class="center">${isMostrador ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center">${isMaquila ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center">${log.creator_name || '-'}</td>
                <td class="center">${log.completado ? '<span class="checkmark">✓</span>' : ''}</td>
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
