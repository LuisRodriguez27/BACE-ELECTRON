import type { Client } from './types';

export const generateClientsPrintHtml = (clientsToPrint: Client[], currentDate: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Directorio de Clientes - ${currentDate}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; font-size: 11px; color: #333; line-height: 1.4; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 18px; color: #1e293b; font-weight: bold; }
        p.date { text-align: center; margin-top: 0; margin-bottom: 20px; color: #64748b; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: middle; }
        th { background-color: #f1f5f9; text-align: center; font-weight: bold; font-size: 10px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        
        /* Color dots for status */
        .color-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 4px;
          vertical-align: middle;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .dot-green { background-color: #22c55e !important; }
        .dot-yellow { background-color: #eab308 !important; }
        .dot-red { background-color: #ef4444 !important; }
        .dot-none { border: 1px dashed #94a3b8; }
        
        @page {
          size: letter;
          margin: 1.5cm 1.5cm 2cm 1.5cm;
          @bottom-right {
            content: "Página " counter(page) " de " counter(pages);
            font-family: Arial, sans-serif;
            font-size: 9px;
            color: #6b7280;
          }
        }

        /* Print optimizations */
        @media print {
          body { margin: 0; }
          tr { break-inside: avoid; }
          th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .color-dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>DIRECTORIO DE CLIENTES - BACE</h1>
      <p class="date">${currentDate} &bull; Total: ${clientsToPrint.length} cliente${clientsToPrint.length !== 1 ? 's' : ''}</p>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">ID</th>
            <th style="width: 50px;">Color</th>
            <th style="width: 220px;">Nombre</th>
            <th style="width: 100px;">Teléfono</th>
            <th style="width: 200px;">Dirección</th>
            <th>Notas/Descripción</th>
          </tr>
        </thead>
        <tbody>
          ${clientsToPrint.length === 0 ? '<tr><td colspan="6" class="center" style="padding: 20px; color: #64748b;">No hay clientes en la lista</td></tr>' : ''}
          ${clientsToPrint.map(client => {
            let dotClass = 'dot-none';
            if (client.color === 'green') {
              dotClass = 'dot-green';
            } else if (client.color === 'yellow') {
              dotClass = 'dot-yellow';
            } else if (client.color === 'red') {
              dotClass = 'dot-red';
            }

            return `
              <tr>
                <td class="center bold">${client.id}</td>
                <td class="center">
                  <span class="color-dot ${dotClass}"></span>
                </td>
                <td class="bold">${client.name}</td>
                <td>${client.phone || '-'}</td>
                <td>${client.address || '-'}</td>
                <td>${client.description || '-'}</td>
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
