import { formatDateMX } from '@/utils/dateUtils';
import type { Note } from './types';

const STATUS_LABEL: Record<Note['status'], string> = {
  Pendiente: 'Pendiente',
  Resuelta: 'Resuelta',
  Archivada: 'Archivada',
};

// NOTA: cuando el usuario proporcione la imagen de fondo para esta bitácora,
// se puede importar aquí (igual que `notaImage` en orders/logbook.ts) y pasarla
// como `backgroundImageUrl` — el contenedor `.note-page` ya está listo para
// recibirla como una capa `.background-image` absoluta detrás del contenido.
export const generateNotePrintHtml = (note: Note, currentDate: string, backgroundImageUrl?: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nota #${note.id} - ${currentDate}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; font-size: 12px; color: #1e293b; }
        .note-page { position: relative; width: 21.6cm; min-height: 14cm; margin: 0 auto; padding: 1.5cm; box-sizing: border-box; }
        .background-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
        h1 { text-align: center; margin: 0 0 4px; font-size: 18px; color: #1e293b; font-weight: bold; }
        p.date { text-align: center; margin: 0 0 20px; color: #64748b; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #cbd5e1; }
        .info-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: bold; }
        .info-item .value { font-size: 13px; color: #1e293b; }
        .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .status-Pendiente { background-color: #fef3c7; color: #92400e; }
        .status-Resuelta { background-color: #dcfce7; color: #166534; }
        .status-Archivada { background-color: #e2e8f0; color: #475569; }
        .note-body { white-space: pre-wrap; word-break: break-word; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #1e293b; }

        @page { size: letter; margin: 1.5cm; }
        @media print {
          body { margin: 0; }
          .note-page { width: auto; min-height: auto; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="note-page">
        ${backgroundImageUrl ? `<img src="${backgroundImageUrl}" alt="Fondo" class="background-image" />` : ''}

        <h1>NOTA #${note.id} - BACE</h1>
        <p class="date">${currentDate}</p>

        <div class="info-grid">
          <div class="info-item">
            <div class="label">Cliente</div>
            <div class="value">${note.client || 'Sin especificar'}</div>
          </div>
          <div class="info-item">
            <div class="label">Teléfono</div>
            <div class="value">${note.phone || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Fecha de la nota</div>
            <div class="value">${formatDateMX(note.date, 'DD/MM/YYYY, h:mm A')}</div>
          </div>
          <div class="info-item">
            <div class="label">Estado</div>
            <div class="value"><span class="status-badge status-${note.status}">${STATUS_LABEL[note.status]}</span></div>
          </div>
          <div class="info-item">
            <div class="label">Creado por</div>
            <div class="value">${note.created_by_username || '-'}</div>
          </div>
          ${note.edited_by_username && note.edited_by_username !== note.created_by_username ? `
          <div class="info-item">
            <div class="label">Editado por</div>
            <div class="value">${note.edited_by_username}</div>
          </div>
          ` : ''}
        </div>

        <div class="note-body">${note.text ? escapeHtml(note.text) : 'Sin contenido registrado.'}</div>
      </div>

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
