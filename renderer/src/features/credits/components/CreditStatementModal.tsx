import React, { useEffect, useState } from 'react';
import { FileText, Loader2, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateMX, todayDateInputMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { CreditApiService } from '../CreditApiService';
import type { Credit, CreditStatement } from '../types';

interface Props {
  credit: Credit;
  onClose: () => void;
}

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
}).format(value);

const escapeHtml = (value: string | null | undefined) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const CreditStatementModal: React.FC<Props> = ({ credit, onClose }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(todayDateInputMX());
  const [statement, setStatement] = useState<CreditStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!to) {
      setError('Selecciona la fecha final del corte');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await CreditApiService.getStatement(credit.id, { from: from || null, to });
      setStatement(result);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // Generate only once when this modal opens for a given credit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credit.id]);

  const printStatement = () => {
    if (!statement) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('No se pudo abrir la ventana de impresión');
      return;
    }

    const rows = statement.movements.map(movement => `
      <tr>
        <td>${escapeHtml(formatDateMX(movement.date, 'DD/MM/YYYY HH:mm'))}</td>
        <td>${escapeHtml(movement.description)}</td>
        <td>${escapeHtml(movement.payment_method || '—')}</td>
        <td class="number">${movement.charge ? money(movement.charge) : '—'}</td>
        <td class="number">${movement.payment ? money(movement.payment) : '—'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Corte de Crédito #${credit.id}</title>
      <style>
        @page { size: letter; margin: 1.4cm; }
        body { font-family: Arial, sans-serif; color: #1f2937; font-size: 12px; }
        h1 { margin: 0; font-size: 22px; color: #1d4ed8; }
        .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 18px; }
        .meta { margin-top: 6px; color: #4b5563; line-height: 1.5; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 18px 0; }
        .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; }
        .box span { display: block; color: #6b7280; font-size: 10px; text-transform: uppercase; }
        .box strong { display: block; margin-top: 5px; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; text-align: left; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
        .number { text-align: right; white-space: nowrap; }
        .footer { margin-top: 22px; text-align: right; color: #6b7280; }
      </style></head><body>
        <div class="header">
          <h1>Corte de Crédito</h1>
          <div class="meta">
            Crédito #${credit.id}<br>
            Cliente: ${escapeHtml(statement.credit.client_name)} · ${escapeHtml(statement.credit.client_phone)}<br>
            Periodo: ${escapeHtml(from || 'Inicio')} al ${escapeHtml(to)}
          </div>
        </div>
        <div class="summary">
          <div class="box"><span>Saldo anterior</span><strong>${money(statement.previous_balance)}</strong></div>
          <div class="box"><span>Cargos</span><strong>${money(statement.total_charges)}</strong></div>
          <div class="box"><span>Abonos</span><strong>${money(statement.total_payments)}</strong></div>
          <div class="box"><span>Saldo al corte</span><strong>${money(statement.closing_balance)}</strong></div>
        </div>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Método</th><th class="number">Cargo</th><th class="number">Abono</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Sin movimientos en el periodo.</td></tr>'}</tbody></table>
        <div class="footer">Generado el ${escapeHtml(formatDateMX(new Date(), 'DD/MM/YYYY HH:mm'))}</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><FileText size={20} className="text-blue-600" /> Corte de crédito #{credit.id}</h2>
            <p className="mt-1 text-sm text-gray-500">{credit.client_name} · {credit.client_phone}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde (opcional)</label>
              <input type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de corte *</label>
              <input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <Button type="button" onClick={generate} disabled={loading} className="gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />} Generar
            </Button>
            <Button type="button" variant="outline" onClick={printStatement} disabled={!statement || loading} className="gap-2">
              <Printer size={15} /> Imprimir
            </Button>
          </div>

          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loading && !statement ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : statement && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['Saldo anterior', statement.previous_balance, 'text-gray-900'],
                  ['Cargos del periodo', statement.total_charges, 'text-blue-700'],
                  ['Abonos del periodo', statement.total_payments, 'text-green-700'],
                  ['Saldo al corte', statement.closing_balance, 'text-orange-700'],
                ].map(([label, amount, color]) => (
                  <div key={String(label)} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs uppercase text-gray-500">{label}</p>
                    <p className={`mt-1 text-lg font-bold ${color}`}>{money(Number(amount))}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Concepto</th><th className="px-3 py-2 text-left">Método</th><th className="px-3 py-2 text-right">Cargo</th><th className="px-3 py-2 text-right">Abono</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.movements.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">Sin movimientos en el periodo.</td></tr>
                    ) : statement.movements.map((movement, index) => (
                      <tr key={`${movement.type}-${movement.id}-${index}`}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-500">{formatDateMX(movement.date, 'DD/MM/YYYY HH:mm')}</td>
                        <td className="px-3 py-2 text-gray-800">{movement.description}</td>
                        <td className="px-3 py-2 text-gray-500">{movement.payment_method || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-blue-700">{movement.charge ? money(movement.charge) : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">{movement.payment ? money(movement.payment) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditStatementModal;

