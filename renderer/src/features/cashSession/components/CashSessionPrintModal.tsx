import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDateMX } from '@/utils/dateUtils';
import type { CashSession, CashSessionSummary } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d: string | null | undefined) =>
  d ? formatDateMX(d, 'DD/MM/YYYY HH:mm') : '—';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: CashSession;
  summary: CashSessionSummary | null;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CashSessionPrintModal: React.FC<Props> = ({ session, summary, onClose }) => {
  const [loading, setLoading] = useState(false);

  const isClosed  = session.status === 'closed';
  const income    = (summary?.total_income    ?? 0);
  const expenses  = (summary?.total_expenses  ?? 0);
  const expected  = (summary?.expected_balance ?? session.expected_balance ?? 0);
  const real      = session.closing_balance ?? 0;
  const diff      = real - expected;

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = async () => {
    setLoading(true);
    try {
      const rows = {
        simplePayments: session.payments ?? [],
        orderPayments:  session.order_payments ?? [],
        expenses:       session.expenses ?? [],
      };

      const tableHtml = (cols: string[], data: string[][]) => `
        <table>
          <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${data.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;

      const printHTML = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8">
<title>Sesión de Caja #${session.id}</title>
<style>
  * { font-family: Arial, sans-serif; box-sizing: border-box; }
  @page { size: Letter portrait; margin: 1.5cm; }
  body { font-size: 10pt; color: #111; }
  h1 { font-size: 15pt; margin: 0 0 2px; }
  .sub { font-size: 9pt; color: #555; }
  .center { text-align: center; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
  .card { border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; }
  .card-label { font-size: 8pt; text-transform: uppercase; color: #777; }
  .card-value { font-size: 13pt; font-weight: bold; margin-top: 2px; }
  .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #1d4ed8; }
  .section { font-size: 10pt; font-weight: bold; background: #f3f4f6;
    padding: 4px 8px; margin: 14px 0 4px; border-left: 3px solid #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #374151; color: #fff; padding: 5px 7px; text-align: left; }
  td { padding: 4px 7px; border-bottom: 1px solid #e5e7eb; }
  .tr { text-align: right; }
  .total-row td { font-weight: bold; background: #f9fafb; border-top: 2px solid #d1d5db; }
  .footer { margin-top: 20px; text-align: center; font-size: 8pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 8pt; font-weight: bold;
    background: ${isClosed ? '#fee2e2' : '#d1fae5'}; color: ${isClosed ? '#991b1b' : '#065f46'}; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="center">
  <h1>Reporte de Sesión de Caja #${session.id}</h1>
  <div class="sub">
    <span class="badge">${isClosed ? 'Cerrada' : 'Activa'}</span>
    &nbsp; Apertura: ${fmtDate(session.opening_date)}
    ${isClosed ? ` &nbsp;|&nbsp; Cierre: ${fmtDate(session.closing_date)}` : ''}
  </div>
  ${session.notes ? `<div class="sub" style="margin-top:4px">Nota: ${session.notes}</div>` : ''}
</div>

<div class="grid2">
  <div class="card"><div class="card-label">Balance Apertura</div><div class="card-value">${fmt(session.opening_balance)}</div></div>
  <div class="card"><div class="card-label">Total Ingresos</div><div class="card-value green">${fmt(income)}</div></div>
  <div class="card"><div class="card-label">Total Gastos</div><div class="card-value red">${fmt(expenses)}</div></div>
  <div class="card"><div class="card-label">Balance Esperado</div><div class="card-value">${fmt(expected)}</div></div>
  ${isClosed ? `
  <div class="card"><div class="card-label">Balance Real</div><div class="card-value blue">${fmt(real)}</div></div>
  <div class="card"><div class="card-label">Diferencia</div><div class="card-value ${diff >= 0 ? 'green' : 'red'}">${fmt(diff)}</div></div>
  ` : ''}
</div>

<div class="section">Pagos — Órdenes Rápidas (${rows.simplePayments.length})</div>
${rows.simplePayments.length === 0 ? '<p style="color:#9ca3af;font-size:9pt">Sin registros.</p>' :
  tableHtml(
    ['Orden', 'Fecha', 'Descripción', 'Empleado', 'Monto'],
    [
      ...rows.simplePayments.map(p => [
        `#${p.simple_order_id}`, fmtDate(p.date), p.descripcion || '—',
        p.user_username || '—', `<span style="font-weight:bold;color:#16a34a">${fmt(p.amount)}</span>`
      ]),
      ['', '', '', '<strong>Total</strong>',
        `<span style="font-weight:bold;color:#16a34a">${fmt(rows.simplePayments.reduce((s, p) => s + p.amount, 0))}</span>`]
    ]
  )
}

<div class="section">Pagos — Órdenes de Crédito (${rows.orderPayments.length})</div>
${rows.orderPayments.length === 0 ? '<p style="color:#9ca3af;font-size:9pt">Sin registros.</p>' :
  tableHtml(
    ['Orden', 'Fecha', 'Descripción', 'Monto'],
    [
      ...rows.orderPayments.map(p => [
        p.order_id ? `#${p.order_id}` : '—', fmtDate(p.date), p.descripcion || '—',
        `<span style="font-weight:bold;color:#1d4ed8">${fmt(p.amount)}</span>`
      ]),
      ['', '', '<strong>Total</strong>',
        `<span style="font-weight:bold;color:#1d4ed8">${fmt(rows.orderPayments.reduce((s, p) => s + p.amount, 0))}</span>`]
    ]
  )
}

<div class="section">Gastos (${rows.expenses.length})</div>
${rows.expenses.length === 0 ? '<p style="color:#9ca3af;font-size:9pt">Sin registros.</p>' :
  tableHtml(
    ['Fecha', 'Descripción', 'Registrado por', 'Monto'],
    [
      ...rows.expenses.map(e => [
        fmtDate(e.date), e.description, e.user_username || '—',
        `<span style="font-weight:bold;color:#dc2626">${fmt(e.amount)}</span>`
      ]),
      ['', '', '<strong>Total gastos</strong>',
        `<span style="font-weight:bold;color:#dc2626">${fmt(rows.expenses.reduce((s, e) => s + e.amount, 0))}</span>`]
    ]
  )
}

<div class="footer">Generado el ${fmtDate(new Date().toISOString())} &nbsp;|&nbsp; Sesión #${session.id}</div>
</body></html>`;

      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast.error('No se pudo abrir la ventana de impresión.'); return; }
      win.document.write(printHTML);
      win.document.close();
      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
          win.onafterprint = () => win.close();
        }, 400);
      };
      toast.success('Documento enviado a impresión');
    } catch (e) {
      console.error(e);
      toast.error('Error al generar el documento de impresión');
    } finally {
      setLoading(false);
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Printer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vista Previa — Sesión #{session.id}</h2>
              <p className="text-sm text-gray-500">Verifica los datos antes de imprimir</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={loading} className="gap-2">
              <Printer size={15} /> {loading ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto p-6 space-y-4 text-sm">

          {/* Title */}
          <div className="text-center border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900">Reporte de Sesión de Caja #{session.id}</h3>
            <p className="text-gray-500 mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${isClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {isClosed ? 'Cerrada' : 'Activa'}
              </span>
              {' '} Apertura: {fmtDate(session.opening_date)}
              {isClosed && <> &nbsp;|&nbsp; Cierre: {fmtDate(session.closing_date)}</>}
            </p>
            {session.notes && <p className="text-gray-400 text-xs mt-1">Nota: {session.notes}</p>}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Balance Apertura', value: fmt(session.opening_balance), cls: 'text-gray-800' },
              { label: 'Total Ingresos',   value: fmt(income),   cls: 'text-green-700' },
              { label: 'Total Gastos',     value: fmt(expenses), cls: 'text-red-700'   },
              { label: 'Bal. Esperado',    value: fmt(expected), cls: 'text-gray-800'  },
              ...(isClosed ? [
                { label: 'Bal. Real',   value: fmt(real), cls: 'text-blue-700' },
                { label: 'Diferencia',  value: fmt(diff), cls: diff >= 0 ? 'text-green-700' : 'text-red-700' },
              ] : []),
            ].map(({ label, value, cls }) => (
              <div key={label} className="border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                <p className={`font-bold text-sm mt-0.5 ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Simple payments */}
          <PreviewTable
            title={`Pagos — Órdenes Rápidas (${session.payments.length})`}
            empty="Sin pagos de órdenes rápidas."
            cols={['Orden', 'Fecha', 'Descripción', 'Empleado', 'Monto']}
            rows={session.payments.map(p => [
              `#${p.simple_order_id}`, fmtDate(p.date), p.descripcion || '—',
              p.user_username || '—',
              <span className="font-medium text-green-700">{fmt(p.amount)}</span>,
            ])}
            total={<span className="font-bold text-green-700">{fmt(session.payments.reduce((s, p) => s + p.amount, 0))}</span>}
          />

          {/* Order payments */}
          <PreviewTable
            title={`Pagos — Órdenes de Crédito (${session.order_payments.length})`}
            empty="Sin pagos de órdenes de crédito."
            cols={['Orden', 'Fecha', 'Descripción', 'Monto']}
            rows={session.order_payments.map(p => [
              p.order_id ? `#${p.order_id}` : '—', fmtDate(p.date), p.descripcion || '—',
              <span className="font-medium text-blue-700">{fmt(p.amount)}</span>,
            ])}
            total={<span className="font-bold text-blue-700">{fmt(session.order_payments.reduce((s, p) => s + p.amount, 0))}</span>}
          />

          {/* Expenses */}
          <PreviewTable
            title={`Gastos (${session.expenses.length})`}
            empty="Sin gastos registrados."
            cols={['Fecha', 'Descripción', 'Registrado por', 'Monto']}
            rows={session.expenses.map(e => [
              fmtDate(e.date), e.description, e.user_username || '—',
              <span className="font-medium text-red-700">{fmt(e.amount)}</span>,
            ])}
            total={<span className="font-bold text-red-700">{fmt(session.expenses.reduce((s, e) => s + e.amount, 0))}</span>}
          />
        </div>
      </div>
    </div>
  );
};

// ── Preview table sub-component ───────────────────────────────────────────────

const PreviewTable: React.FC<{
  title: string;
  empty: string;
  cols: string[];
  rows: React.ReactNode[][];
  total: React.ReactNode;
}> = ({ title, empty, cols, rows, total }) => (
  <div>
    <div className="text-xs font-semibold uppercase text-gray-600 bg-gray-100 px-3 py-1.5 rounded mb-1 border-l-2 border-gray-400">
      {title}
    </div>
    {rows.length === 0 ? (
      <p className="text-gray-400 text-xs py-2 px-3">{empty}</p>
    ) : (
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-700 text-white">
            {cols.map(c => <th key={c} className="px-3 py-1.5 text-left font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {row.map((cell, j) => <td key={j} className="px-3 py-1.5">{cell}</td>)}
            </tr>
          ))}
          <tr className="bg-gray-50 border-t-2 border-gray-200">
            {cols.map((_, i) => (
              <td key={i} className="px-3 py-1.5 font-semibold">
                {i === cols.length - 2 ? 'Total' : i === cols.length - 1 ? total : ''}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    )}
  </div>
);

export default CashSessionPrintModal;
