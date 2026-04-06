import { formatDateMX } from '@/utils/dateUtils';
import type { Order } from './types';

export const generateLogbookHtml = (ordersToPrint: Order[], currentDate: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bitácora de Trabajo - ${currentDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
        p.date { text-align: center; margin-top: 0; margin-bottom: 15px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
        .center { text-align: center; }
        .check-col { width: 40px; text-align: center; }
        .client-subcol { width: 35px; }
        
        /* Background Colors for Status */
        .bg-diseno { background-color: #ffd1dc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Rosa Palo */
        .bg-produccion { background-color: #ffff99 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Amarillo Canario */
        .bg-entrega { background-color: #90ee90 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Verde Manzana/Claro */
        
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
      <h1>BITÁCORA DE TRABAJO - BACE</h1>
      <p class="date">${currentDate}</p>

      <table>
        <thead>
          <tr>
            <th rowspan="2" style="width: 50px;">Folio</th>
            <th rowspan="2" style="width: 70px;">Fecha Rec.</th>
            <th rowspan="2" style="width: 150px;">Cliente</th>
            <th rowspan="2" style="width: 80px;">Usuario</th>
            <th rowspan="2">Descripción</th>
            <th colspan="3">Estatus</th>
            <th colspan="2">Cliente</th>
            <th rowspan="2" style="width: 70px;">Fecha Ent.</th>
          </tr>
          <tr>
            <th class="check-col">Diseño</th>
            <th class="check-col">Prod.</th>
            <th class="check-col">Entrega</th>
            <th class="client-subcol">MOS</th>
            <th class="client-subcol">MAQ</th>
          </tr>
        </thead>
        <tbody>
          ${ordersToPrint.length === 0 ? '<tr><td colspan="11" class="center">No hay órdenes pendientes</td></tr>' : ''}
          ${ordersToPrint.map(order => {
            const dateR = formatDateMX(order.date, 'DD/MM/YYYY');
            const dateE = order.estimated_delivery_date ? formatDateMX(order.estimated_delivery_date, 'DD/MM/YYYY') : '-';
            
            // Mapeo de estados a columnas
            // Diseño -> Columna Diseño
            const isDiseño = order.status === 'Diseño';
            // Produccion -> Columna Prod.
            const isProduccion = order.status === 'Produccion';
            // Entrega -> Columna Entrega
            const isEntrega = order.status === 'Entrega';

            const isMostrador = order.responsable === 'Mostrador';
            const isMaquila = order.responsable === 'Maquila';

            return `
              <tr>
                <td class="center"><strong>${order.id}</strong></td>
                <td class="center">${dateR}</td>
                <td>${order.client_name || order.client?.name || 'Sin Cliente'}</td>
                <td class="center">${order.user?.username || '-'}</td>
                <td>${order.description || order.notes || ''}</td>
                <td class="center ${isDiseño ? 'bg-diseno' : ''}"></td>
                <td class="center ${isProduccion ? 'bg-produccion' : ''}"></td>
                <td class="center ${isEntrega ? 'bg-entrega' : ''}"></td>
                <td class="center">${isMostrador ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center">${isMaquila ? '<span class="checkmark">✓</span>' : ''}</td>
                <td class="center">${dateE}</td>
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
