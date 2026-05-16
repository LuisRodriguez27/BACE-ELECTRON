import { formatDateMX } from '@/utils/dateUtils';
import type { Payment } from './types';
import type { Order } from '../orders/types';

// ─── Tipos auxiliares ──────────────────────────────────────────────────────
export interface PaymentLogbookFilters {
  dateFrom?: string;  // YYYY-MM-DD
  dateTo?: string;    // YYYY-MM-DD
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const filterByDate = (payments: Payment[], filters: PaymentLogbookFilters) => {
  return payments.filter(p => {
    if (!p.date) return true;
    const d = new Date(p.date);
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom + 'T00:00:00');
      if (d < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + 'T23:59:59');
      if (d > to) return false;
    }
    return true;
  });
};

const commonStyles = `
  body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #111; }
  h1 { text-align: center; margin-bottom: 4px; font-size: 16px; text-transform: uppercase; }
  h2 { text-align: center; margin-top: 0; margin-bottom: 4px; font-size: 12px; color: #444; font-weight: normal; }
  p.date { text-align: center; margin: 0 0 16px 0; color: #666; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #000; padding: 4px 5px; text-align: left; vertical-align: middle; }
  th { background-color: #dce6f1; text-align: center; font-weight: bold; font-size: 10px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .total-row td { background-color: #f0f0f0 !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .badge-libre { background-color: #fef3c7; color: #92400e; padding: 1px 4px; border-radius: 3px; font-size: 9px; }
  .badge-orden { background-color: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 3px; font-size: 9px; }
  .bg-pendiente { background-color: #fde8d0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bg-sin-pago  { background-color: #fecaca !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .bg-pagado    { background-color: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    @page { size: portrait; margin: 0.5cm; }
    body { margin: 0; }
    tr { break-inside: avoid; }
  }
`;

const printScript = `
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    }
  </script>
`;

// ─── Bitácora 1: Pagos Recibidos ───────────────────────────────────────────
// Lista todos los pagos ingresados (con o sin orden), filtrado por fecha.
export const generatePaymentsReceivedLogbook = (
  payments: Payment[],
  filters: PaymentLogbookFilters,
  currentDate: string,
  orders: Order[] = []
): string => {
  const filtered = filterByDate(payments, filters);

  const rangeLabel = filters.dateFrom || filters.dateTo
    ? `Período: ${filters.dateFrom ?? '—'} al ${filters.dateTo ?? '—'}`
    : 'Todos los registros';

  const totalAmount = filtered.reduce((acc, p) => acc + p.amount, 0);

  const rows = filtered.length === 0
    ? `<tr><td colspan="7" class="center">No hay pagos en el período seleccionado</td></tr>`
    : filtered.map(p => {
        const dateStr = p.date ? formatDateMX(p.date, 'DD/MM/YYYY HH:mm') : '—';
        const orderBadge = p.order_id
          ? `<span class="badge-orden">Orden #${p.order_id}</span>`
          : `<span class="badge-libre">Libre</span>`;
        const clienteStr = p.order ? (p.order.client_name ?? '—') : '—';
        
        let descripcionStr = p.info ? p.info : '—';
        if (p.order_id) {
          let orderDesc = p.order?.description || p.order?.notes;
          if (orders && orders.length > 0) {
            const relatedOrder = orders.find(o => o.id === p.order_id);
            if (relatedOrder) {
              orderDesc = relatedOrder.description || relatedOrder.notes || orderDesc;
            }
          }
          if (orderDesc) {
            descripcionStr = p.info ? `${orderDesc} (Pago: ${p.info})` : orderDesc;
          }
        }
        
        return `
          <tr>
            <td class="center"><strong>${p.id}</strong></td>
            <td class="center">${dateStr}</td>
            <td class="center">${orderBadge}</td>
            <td>${clienteStr}</td>
            <td>${descripcionStr}</td>
            <td class="center">${p.descripcion ?? '—'}</td>
            <td class="right"><strong>$${fmt(p.amount)}</strong></td>
          </tr>`;
      }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Bitácora de Pagos Recibidos - ${currentDate}</title>
  <style>${commonStyles}</style>
</head>
<body>
  <h1>BACE — Bitácora de Pagos Recibidos</h1>
  <h2>${rangeLabel}</h2>
  <p class="date">Impreso: ${currentDate}</p>

  <table>
    <thead>
      <tr>
        <th style="width:45px"># Pago</th>
        <th style="width:110px">Fecha</th>
        <th style="width:80px">Tipo</th>
        <th style="width:130px">Cliente</th>
        <th>Descripción</th>
        <th style="width:90px">Método</th>
        <th style="width:80px">Monto</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6" class="right">TOTAL ${filtered.length} pago(s):</td>
        <td class="right">$${fmt(totalAmount)}</td>
      </tr>
    </tbody>
  </table>
  ${printScript}
</body>
</html>`;
};

// ─── Bitácora 2: Órdenes con Pagos Pendientes ─────────────────────────────
// Muestra órdenes que tienen saldo pendiente (total - pagado > 0),
// con opción de filtrar por fecha de la orden.
export interface OrderWithBalance extends Order {
  totalPaid: number;
  balance: number;
}

export const generatePendingPaymentsLogbook = (
  orders: OrderWithBalance[],
  filters: PaymentLogbookFilters,
  currentDate: string
): string => {
  // Filtrar por fecha de la orden
  const filtered = orders.filter(o => {
    if (!o.date) return true;
    const d = new Date(o.date);
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom + 'T00:00:00');
      if (d < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo + 'T23:59:59');
      if (d > to) return false;
    }
    return true;
  });

  const rangeLabel = filters.dateFrom || filters.dateTo
    ? `Período: ${filters.dateFrom ?? '—'} al ${filters.dateTo ?? '—'}`
    : 'Todos los registros';

  const totalPendiente = filtered.reduce((acc, o) => acc + o.balance, 0);
  const totalOrders = filtered.length;

  const rows = filtered.length === 0
    ? `<tr><td colspan="7" class="center">No hay órdenes con pagos pendientes en el período seleccionado</td></tr>`
    : filtered.map(o => {
        const dateStr = formatDateMX(o.date, 'DD/MM/YYYY');
        const isSinPago = o.totalPaid <= 0 && o.balance > 0;
        const rowClass = isSinPago ? 'bg-sin-pago' : 'bg-pendiente';
        const clientName = o.client?.name ?? o.client_name ?? '—';
        return `
          <tr class="${rowClass}">
            <td class="center"><strong>#${o.id}</strong></td>
            <td class="center">${dateStr}</td>
            <td>${clientName}</td>
            <td>${o.description ?? o.notes ?? '—'}</td>
            <td class="right">$${fmt(o.total)}</td>
            <td class="right">$${fmt(o.totalPaid)}</td>
            <td class="right"><strong>$${fmt(o.balance)}</strong></td>
          </tr>`;
      }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Bitácora de Pagos Pendientes - ${currentDate}</title>
  <style>
    ${commonStyles}
    .legend { display: flex; gap: 16px; margin-bottom: 10px; font-size: 10px; justify-content: center; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 2px; display: inline-block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <h1>BACE — Órdenes con Pagos Pendientes</h1>
  <h2>${rangeLabel}</h2>
  <p class="date">Impreso: ${currentDate}</p>

  <div class="legend">
    <div class="legend-item">
      <span class="legend-dot" style="background:#fecaca"></span> Sin abono
    </div>
    <div class="legend-item">
      <span class="legend-dot" style="background:#fde8d0"></span> Con abono parcial
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:55px">Folio</th>
        <th style="width:80px">Fecha</th>
        <th style="width:130px">Cliente</th>
        <th>Descripción</th>
        <th style="width:75px">Total</th>
        <th style="width:75px">Pagado</th>
        <th style="width:75px">Pendiente</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6" class="right">TOTAL PENDIENTE (${totalOrders} orden(es)):</td>
        <td class="right">$${fmt(totalPendiente)}</td>
      </tr>
    </tbody>
  </table>
  ${printScript}
</body>
</html>`;
};
