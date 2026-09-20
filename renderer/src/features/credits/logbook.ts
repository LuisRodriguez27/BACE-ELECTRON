import { formatDateMX } from '@/utils/dateUtils';
import type { Credit, CreditFilters } from './types';

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const escapeHtml = (value: string | number | null | undefined) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const statusLabel = (status: Credit['status']) => status === 'open' ? 'Pendiente' : 'Completado';

const periodLabel = ({ from, to }: CreditFilters) => {
  if (from && to) return `Aperturas del ${from} al ${to}`;
  if (from) return `Aperturas desde ${from}`;
  if (to) return `Aperturas hasta ${to}`;
  return 'Todas las fechas de apertura';
};

/**
 * Cada pago ocupa una fila de la tabla principal. Las demás celdas del crédito
 * se fusionan verticalmente mediante rowspan, como al dividir una celda en Excel.
 */
const creditRowsHtml = (credit: Credit): string => {
  const payments = credit.payments.length ? credit.payments : [null];
  const rowSpan = payments.length;

  return payments.map((payment, index) => {
    const firstPaymentRow = index === 0;
    return `
      <tr>
        ${firstPaymentRow ? `
          <td class="center" rowspan="${rowSpan}"><strong>#${credit.id}</strong></td>
          <td class="center" rowspan="${rowSpan}">${escapeHtml(formatDateMX(credit.opened_at, 'DD/MM/YYYY HH:mm'))}</td>
          <td rowspan="${rowSpan}">${escapeHtml(credit.client_name || 'Sin nombre')}<span class="client-phone">${escapeHtml(credit.client_phone || 'Sin teléfono')}</span></td>
          <td class="center ${credit.status === 'open' ? 'pending' : 'completed'}" rowspan="${rowSpan}">${statusLabel(credit.status)}</td>
          <td class="number" rowspan="${rowSpan}">${money(credit.total_charges)}</td>
          <td class="number" rowspan="${rowSpan}">${money(credit.total_paid)}</td>
        ` : ''}
        <td class="payment-cell">${payment
          ? `${escapeHtml(formatDateMX(payment.date, 'DD/MM/YY'))} · <strong>${escapeHtml(payment.descripcion || 'Sin método')}</strong> · ${money(payment.amount)}`
          : '<span class="no-payment">Sin abonos</span>'}</td>
        ${firstPaymentRow ? `<td class="number" rowspan="${rowSpan}"><strong>${money(credit.balance)}</strong></td>` : ''}
      </tr>
    `;
  }).join('');
};

/** HTML autocontenido, siguiendo el patrón de la bitácora de Órdenes. */
export const generateCreditsLogbookHtml = (credits: Credit[], filters: CreditFilters, currentDate: string): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Reporte de Créditos - ${escapeHtml(currentDate)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #111827; }
      h1 { text-align: center; margin-bottom: 5px; font-size: 16px; }
      p.meta { text-align: center; margin: 3px 0; color: #4b5563; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #111827; padding: 5px; text-align: left; vertical-align: middle; }
      th { background: #f0f0f0; text-align: center; font-weight: bold; font-size: 10px; }
      .center { text-align: center; }
      .number { text-align: right; white-space: nowrap; }
      .client-phone { display: block; font-size: 9px; color: #4b5563; margin-top: 2px; }
      .payment-cell { font-size: 9px; line-height: 1.45; white-space: nowrap; }
      .no-payment { color: #6b7280; }
      .pending { background-color: #fff3cd !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .completed { background-color: #d1fae5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot td { font-weight: bold; background: #f3f4f6; }
      @media print {
        @page { size: landscape; margin: 0.5cm; }
        body { margin: 0; }
        tr { break-inside: avoid; }
        td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <h1>REPORTE DE CRÉDITOS - BACE</h1>
    <p class="meta">${escapeHtml(periodLabel(filters))} · Estado: ${escapeHtml(filters.status === 'closed' ? 'Completados' : filters.status === 'open' ? 'Pendientes' : 'Todos')}</p>
    <p class="meta">Generado el ${escapeHtml(currentDate)}</p>
    <table>
      <thead><tr>
        <th>Folio</th><th>Fecha de apertura</th><th>Cliente</th><th>Estado</th>
        <th>Cargos</th><th>Abonado</th><th>Pagos y método</th><th>Saldo pendiente</th>
      </tr></thead>
      <tbody>
        ${credits.length === 0 ? '<tr><td colspan="8" class="center">No hay créditos que coincidan con los filtros.</td></tr>' : ''}
        ${credits.map(creditRowsHtml).join('')}
      </tbody>
      ${credits.length > 0 ? `<tfoot><tr><td colspan="4">Totales (${credits.length} créditos)</td><td class="number">${money(credits.reduce((sum, credit) => sum + credit.total_charges, 0))}</td><td class="number">${money(credits.reduce((sum, credit) => sum + credit.total_paid, 0))}</td><td class="center">—</td><td class="number">${money(credits.reduce((sum, credit) => sum + credit.balance, 0))}</td></tr></tfoot>` : ''}
    </table>
    <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
  </body>
  </html>
`;

export const generateCreditDetailHtml = (credit: Credit, currentDate: string): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Crédito #${credit.id}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #111827; }
      h1 { margin: 0 0 5px; font-size: 18px; } .meta { color: #4b5563; line-height: 1.5; }
      .summary { display: flex; gap: 10px; margin: 16px 0; } .box { border: 1px solid #9ca3af; padding: 9px; flex: 1; }
      .box span { display: block; color: #4b5563; font-size: 9px; text-transform: uppercase; } .box strong { display:block; margin-top:4px; font-size:14px; }
      h2 { margin: 18px 0 6px; font-size: 13px; } table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #111827; padding: 5px; text-align: left; } th { background:#f0f0f0; font-size:10px; }
      .number { text-align:right; white-space:nowrap; } .center { text-align:center; }
      @media print { @page { size: letter; margin: .8cm; } body { margin: 0; } tr { break-inside: avoid; } }
    </style>
  </head>
  <body>
    <h1>CRÉDITO #${credit.id} - BACE</h1>
    <div class="meta">Cliente: <strong>${escapeHtml(credit.client_name || 'Sin nombre')}</strong> · ${escapeHtml(credit.client_phone || 'Sin teléfono')}<br>
      Apertura: ${escapeHtml(formatDateMX(credit.opened_at, 'DD/MM/YYYY HH:mm'))} · Estado: ${statusLabel(credit.status)}${credit.closing_date ? ` · Cierre: ${escapeHtml(formatDateMX(credit.closing_date, 'DD/MM/YYYY HH:mm'))}` : ''}</div>
    <div class="summary"><div class="box"><span>Total cargos</span><strong>${money(credit.total_charges)}</strong></div><div class="box"><span>Total abonado</span><strong>${money(credit.total_paid)}</strong></div><div class="box"><span>Saldo pendiente</span><strong>${money(credit.balance)}</strong></div></div>
    <h2>Cargos</h2><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="number">Cantidad</th><th class="number">P. unitario</th><th class="number">Total</th></tr></thead><tbody>
      ${credit.items.length ? credit.items.map(item => `<tr><td>${escapeHtml(formatDateMX(item.date, 'DD/MM/YYYY HH:mm'))}</td><td>${escapeHtml(item.product)}</td><td class="number">${item.quantity}</td><td class="number">${money(item.unit_price)}</td><td class="number">${money(item.total)}</td></tr>`).join('') : '<tr><td colspan="5" class="center">Sin cargos activos.</td></tr>'}
    </tbody></table>
    <h2>Abonos</h2><table><thead><tr><th>Fecha</th><th>Método</th><th>Información</th><th class="number">Monto</th></tr></thead><tbody>
      ${credit.payments.length ? credit.payments.map(payment => `<tr><td>${escapeHtml(formatDateMX(payment.date, 'DD/MM/YYYY HH:mm'))}</td><td>${escapeHtml(payment.descripcion || 'Sin método')}</td><td>${escapeHtml(payment.info || '')}</td><td class="number">${money(payment.amount)}</td></tr>`).join('') : '<tr><td colspan="4" class="center">Sin abonos.</td></tr>'}
    </tbody></table>
    ${credit.notes ? `<h2>Notas</h2><p>${escapeHtml(credit.notes)}</p>` : ''}
    <p class="meta" style="text-align:right; margin-top:16px;">Generado el ${escapeHtml(currentDate)}</p>
    <script>window.onload = () => setTimeout(() => window.print(), 500);</script>
  </body></html>
`;
