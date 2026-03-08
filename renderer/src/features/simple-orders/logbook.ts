import dayjs from 'dayjs';
import type { SimpleOrder } from './types';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const generateSimpleOrdersLogbookHtml = (ordersToPrint: SimpleOrder[], currentDate: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bitácora de Órdenes Rápidas - ${currentDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
        p.date { text-align: center; margin-top: 0; margin-bottom: 15px; color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; vertical-align: middle; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
        .center { text-align: center; }
        .right { text-align: right; }
        
        /* Background Colors for Status */
        .bg-pendiente { background-color: #ffdaeb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Rosa */
        .bg-sin-abono { background-color: #ffcccc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Rojo claro */
        
        /* Print optimizations */
        @media print {
          @page { size: portrait; margin: 0.5cm; }
          body { margin: 0; }
          tr { break-inside: avoid; }
          td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>ÓRDENES RÁPIDAS (PENDIENTES Y SIN ABONO) - BACE</h1>
      <p class="date">${currentDate}</p>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">Folio</th>
            <th style="width: 90px;">Fecha</th>
            <th>Concepto</th>
            <th style="width: 90px;">Empleado</th>
            <th style="width: 70px;">Total</th>
            <th style="width: 70px;">Abonado</th>
            <th style="width: 70px;">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${ordersToPrint.length === 0 ? '<tr><td colspan="7" class="center">No hay órdenes pendientes</td></tr>' : ''}
          ${ordersToPrint.map(order => {
            let date = dayjs(order.date);
            if (date.utc().hour() === 0 && date.utc().minute() === 0 && date.utc().second() === 0) {
              date = date.add(1, 'day');
            }
            const dateStr = date.tz('America/Mexico_City').format('DD/MM/YY HH:mm');
            
            const isSinAbono = order.totalPaid <= 0 && order.balance > 0;
            const isPendiente = order.totalPaid > 0 && order.balance > 0;
            
            const rowClass = isSinAbono ? 'bg-sin-abono' : (isPendiente ? 'bg-pendiente' : '');

            return `
              <tr class="${rowClass}">
                <td class="center"><strong>${order.id}</strong></td>
                <td class="center">${dateStr}</td>
                <td>${order.concept}</td>
                <td class="center">${order.user?.username || 'N/A'}</td>
                <td class="right">$${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="right">$${order.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="right"><strong>$${order.balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
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
