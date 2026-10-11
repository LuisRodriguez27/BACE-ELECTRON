import html2canvas from 'html2canvas';
import postitImage from '@/assets/POSTIT.jpg';
import { formatDateMX } from '@/utils/dateUtils';
import { NOTE_DIVIDER } from '../noteTextUtils';
import type { Note } from '../types';

export const NOTE_PAGE = {
  widthCm: 21.6,
  heightCm: 17,
  widthPx: 816,
  heightPx: 643,
  maxCharactersPerLine: 78,
  linesPerPage: 16,
  captureGapPx: 16,
} as const;

export type NoteDocumentProfile = 'print' | 'whatsapp';

export interface PreparedNoteHtml {
  pagesHtml: string;
  pageCount: number;
}

type NoteLine =
  | { type: 'text'; value: string }
  | { type: 'divider' };

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('No se pudo preparar la plantilla de la nota'));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 1));
    };
    image.onerror = () => reject(new Error('No se pudo cargar la plantilla POSTIT.jpg'));
    image.src = url;
  });

function wrapTextLine(value: string): string[] {
  const maxLength = NOTE_PAGE.maxCharactersPerLine;
  const wrapped: string[] = [];
  let remaining = value;

  if (!remaining) return [''];

  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength + 1);
    const lastWhitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\t'));
    const breakAt = lastWhitespace > 0 ? lastWhitespace : maxLength;
    wrapped.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }

  wrapped.push(remaining);
  return wrapped;
}

function getNoteLines(note: Note): NoteLine[] {
  const source = note.text?.replace(/\r\n?/g, '\n') || 'Sin contenido registrado.';
  const lines = source.split('\n').flatMap<NoteLine>(line => {
    if (line.trim() === NOTE_DIVIDER) return [{ type: 'divider' }];
    return wrapTextLine(line).map(value => ({ type: 'text', value }));
  });

  return lines.length > 0 ? lines : [{ type: 'text', value: '' }];
}

function chunkLines(lines: NoteLine[]): NoteLine[][] {
  const chunks: NoteLine[][] = [];
  for (let index = 0; index < lines.length; index += NOTE_PAGE.linesPerPage) {
    chunks.push(lines.slice(index, index + NOTE_PAGE.linesPerPage));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function buildLinesHtml(lines: NoteLine[]): string {
  return lines.map(line => {
    if (line.type === 'divider') {
      return '<div style="height:22px;display:flex;align-items:center;"><div style="width:100%;border-top:1px solid #64748b;"></div></div>';
    }

    return `<div style="min-height:22px;white-space:pre-wrap;overflow-wrap:anywhere;">${line.value ? escapeHtml(line.value) : '&nbsp;'}</div>`;
  }).join('');
}

function buildPageHtml(params: {
  note: Note;
  lines: NoteLine[];
  backgroundImage: string;
  pageIndex: number;
  pageCount: number;
  profile: NoteDocumentProfile;
}): string {
  const { note, lines, backgroundImage, pageIndex, pageCount, profile } = params;
  const pageBreak = pageIndex > 0 ? 'page-break-before:always;' : '';
  const profileClass = profile === 'whatsapp' ? ' note-document-page--whatsapp' : '';
  const contactValueStyle = profile === 'whatsapp'
    ? 'height:30px;padding-bottom:6px;font-size:17px;line-height:24px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
    : 'font-size:17px;line-height:24px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  const editedBy = note.edited_by_username && note.edited_by_username !== note.created_by_username
    ? ` · EDITÓ ${escapeHtml(note.edited_by_username)}`
    : '';

  return `
    <div class="note-document-page${profileClass}" style="position:relative;width:${NOTE_PAGE.widthPx}px;height:${NOTE_PAGE.heightPx}px;overflow:hidden;background:#fff;flex:none;${pageBreak}">
      <img src="${backgroundImage}" alt="Fondo" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0;" />

      <div style="position:absolute;top:105px;left:42px;right:42px;height:34px;display:flex;align-items:center;justify-content:space-between;color:#111827;z-index:1;">
        <div style="font-size:20px;line-height:1;font-weight:800;">NOTA #${escapeHtml(note.id)}</div>
        <div style="display:flex;align-items:center;gap:14px;font-size:14px;font-weight:700;">
          <span>${escapeHtml(formatDateMX(note.date, 'DD/MM/YYYY'))}</span>
          <span>${escapeHtml(formatDateMX(note.date, 'HH:mm'))}</span>
        </div>
      </div>

      <div style="position:absolute;top:144px;left:42px;right:42px;height:42px;display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:24px;color:#111827;z-index:1;">
        <div style="min-width:0;">
          <div style="font-size:10px;line-height:12px;font-weight:800;letter-spacing:.08em;color:#475569;">CLIENTE</div>
          <div style="${contactValueStyle}">${escapeHtml(note.client || 'Sin especificar')}</div>
        </div>
        <div style="min-width:0;">
          <div style="font-size:10px;line-height:12px;font-weight:800;letter-spacing:.08em;color:#475569;">TELÉFONO</div>
          <div style="${contactValueStyle}">${escapeHtml(note.phone || '-')}</div>
        </div>
      </div>

      <div style="position:absolute;top:175px;left:42px;right:42px;height:354px;padding:12px 16px;color:#0f172a;font-family:Consolas,'Courier New',monospace;font-size:15px;line-height:22px;z-index:1;">
        ${buildLinesHtml(lines)}
      </div>

      <div style="position:absolute;left:42px;right:42px;bottom:72px;display:flex;align-items:center;justify-content:space-between;font-size:11px;line-height:1;font-weight:700;color:#334155;z-index:1;">
        <span>ATENDIÓ ${escapeHtml(note.created_by_username || '-')}${editedBy}</span>
        <span>PÁGINA ${pageIndex + 1} DE ${pageCount}</span>
      </div>
    </div>`;
}

export async function prepareNoteHtml(
  note: Note,
  profile: NoteDocumentProfile = 'print'
): Promise<PreparedNoteHtml> {
  const pages = chunkLines(getNoteLines(note));
  const backgroundImage = await imageToBase64(postitImage);
  const pagesHtml = pages.map((lines, pageIndex) => buildPageHtml({
    note,
    lines,
    backgroundImage,
    pageIndex,
    pageCount: pages.length,
    profile,
  })).join('');

  return { pagesHtml, pageCount: pages.length };
}

export function buildNotePrintHtml(params: { noteId: number; pagesHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nota #${escapeHtml(params.noteId)}</title>
  <style>
    * { box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,sans-serif; }
    @page { size:${NOTE_PAGE.widthCm}cm ${NOTE_PAGE.heightCm}cm landscape;margin:0; }
    html,body { width:${NOTE_PAGE.widthCm}cm!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff; }
    .note-document-page { width:${NOTE_PAGE.widthCm}cm!important;height:${NOTE_PAGE.heightCm}cm!important;position:relative!important;margin:0!important;padding:0!important;overflow:hidden!important;page-break-after:always; }
    .note-document-page:last-child { page-break-after:auto; }
  </style>
</head>
<body>${params.pagesHtml}</body>
</html>`;
}

const waitForDocumentImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map(image => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error('No se pudo cargar una imagen de la nota')), { once: true });
    });
  }));
};

export async function captureNoteHtmlAsPng(documentHtml: PreparedNoteHtml): Promise<Blob> {
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:fixed;top:-100000px;left:-100000px;background:#fff;pointer-events:none;';

  const pagesContainer = document.createElement('div');
  pagesContainer.style.cssText = `display:flex;flex-direction:column;gap:${NOTE_PAGE.captureGapPx}px;width:${NOTE_PAGE.widthPx}px;background:#fff;`;
  pagesContainer.innerHTML = documentHtml.pagesHtml;
  offscreenHost.appendChild(pagesContainer);
  document.body.appendChild(offscreenHost);

  try {
    await waitForDocumentImages(pagesContainer);
    const captureHeight = documentHtml.pageCount * NOTE_PAGE.heightPx
      + Math.max(0, documentHtml.pageCount - 1) * NOTE_PAGE.captureGapPx;
    const scale = Math.max(0.25, Math.min(2, 30000 / captureHeight));
    const canvas = await html2canvas(pagesContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale,
      logging: false,
      width: NOTE_PAGE.widthPx,
      height: captureHeight,
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen PNG'));
      }, 'image/png', 1);
    });
  } finally {
    offscreenHost.remove();
  }
}
