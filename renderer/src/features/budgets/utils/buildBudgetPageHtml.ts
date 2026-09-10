import html2canvas from 'html2canvas';
import cotizacionImage from '@/assets/COTIZACION.jpg';
import { formatDateMX } from '@/utils/dateUtils';
import {
  getBudgetItemDescription,
  getBudgetItemDisplayName,
  getBudgetItemType,
  type Budget,
} from '../types';

export const BUDGET_PAGE = {
  widthCm: 21.6,
  heightCm: 18.5,
  widthPx: 816,
  heightPx: 699,
  printOffsetMm: -5,
  itemsPerPage: 5,
  captureGapPx: 16,
} as const;

export interface PreparedBudgetHtml {
  pagesHtml: string;
  pageCount: number;
  widthPx: number;
  heightPx: number;
}

export type BudgetDocumentProfile = 'print' | 'whatsapp';

const BUDGET_LAYOUT = {
  print: {
    widthPx: BUDGET_PAGE.widthPx,
    heightPx: BUDGET_PAGE.heightPx,
    idTop: 68,
    infoTop: 136,
    infoColumnGap: 88,
    productsTop: 160,
    totalBottom: 20,
  },
  whatsapp: {
    widthPx: 800,
    heightPx: 662,
    idTop: 52,
    infoTop: 118,
    infoColumnGap: 80,
    productsTop: 146,
    totalBottom: 35,
  },
} as const;

const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = url;
  });

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value: number) =>
  Number(value).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getClientColor = (color?: string | null) => {
  if (color === 'green') return '#22c55e';
  if (color === 'yellow') return '#eab308';
  if (color === 'red') return '#ef4444';
  return null;
};

function buildBudgetPageHtml(params: {
  budgetData: Budget;
  products: NonNullable<Budget['budgetProducts']>;
  backgroundImage: string;
  hasPreferentialPrice: boolean;
  pageBreak: boolean;
  profile: BudgetDocumentProfile;
}): string {
  const { budgetData, products, backgroundImage, hasPreferentialPrice, pageBreak, profile } = params;
  const clientColor = getClientColor(budgetData.client?.color);
  const layout = BUDGET_LAYOUT[profile];
  const isWhatsApp = profile === 'whatsapp';

  return `
    <div class="budget-document-page" style="position:relative;width:${layout.widthPx}px;height:${layout.heightPx}px;overflow:hidden;background:#fff;flex:none;${pageBreak ? 'page-break-before:always;' : ''}">
      <img src="${backgroundImage}" alt="Fondo" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;" />

      ${hasPreferentialPrice ? `
        <div style="position:absolute;bottom:64px;right:20px;width:88px;background:#dc2626;color:#fff;font-weight:700;font-size:8px;text-align:center;padding:6px 4px;box-sizing:border-box;z-index:10;line-height:1.2;">
          USTED HA ADQUIRIDO UN PRECIO ESPECIAL
        </div>
      ` : ''}

      <div style="position:absolute;top:${layout.idTop}px;right:112px;font-size:24px;line-height:${isWhatsApp ? '24px' : '32px'};font-weight:700;color:#dc2626;z-index:1;">
        ${escapeHtml(budgetData.id)}
      </div>

      <div style="position:absolute;top:${layout.infoTop}px;left:100px;font-size:16px;line-height:${isWhatsApp ? '28.8px' : '24px'};font-weight:700;color:#000;z-index:1;">
        <div style="display:grid;grid-template-columns:272px 128px 128px;column-gap:${layout.infoColumnGap}px;align-items:center;">
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;display:flex;align-items:center;gap:8px;min-width:0;">
            ${clientColor ? `<span style="width:16px;height:16px;border-radius:9999px;background:${clientColor};flex:none;"></span>` : ''}
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(budgetData.client?.name || 'Cliente no especificado')}</span>
          </div>
          <div style="text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(budgetData.client?.phone || '')}</div>
          <div style="text-align:center;white-space:nowrap;">${escapeHtml(formatDateMX(budgetData.date, 'DD/MM/YYYY'))}</div>
        </div>
      </div>

      <div style="position:absolute;top:${layout.productsTop}px;left:32px;right:40px;color:#000;z-index:1;">
        <div style="display:grid;grid-template-columns:50px 1fr 90px 90px;gap:8px;font-size:${isWhatsApp ? '16px' : '18px'};line-height:${isWhatsApp ? '16px' : '28px'};font-weight:600;margin-bottom:${isWhatsApp ? '0' : '8px'};border-bottom:1px solid #9ca3af;padding-bottom:${isWhatsApp ? '12px' : '4px'};">
          <div style="text-align:center;">Cant.</div>
          <div style="text-align:left;">Producto</div>
          <div style="text-align:right;">P. Unitario</div>
          <div style="text-align:right;">Total</div>
        </div>
        ${products.map(item => `
          <div style="display:grid;grid-template-columns:50px 1fr 90px 90px;gap:8px;${isWhatsApp ? 'border-bottom:1px solid rgb(230,230,230);' : ''}margin-bottom:${isWhatsApp ? '0' : '8px'};font-size:16px;line-height:${isWhatsApp ? '19.2px' : '24px'};padding:${isWhatsApp ? '0 0 6px' : '4px 0'};">
            <div style="text-align:center;">${escapeHtml(item.quantity)}</div>
            <div style="padding-left:4px;min-width:0;">
              <div style="font-weight:500;${isWhatsApp ? '' : 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}">${escapeHtml(getBudgetItemDisplayName(item))}</div>
              ${getBudgetItemDescription(item) ? `<div style="font-size:${isWhatsApp ? '13px' : '14px'};color:#374151;margin-top:${isWhatsApp ? '1px' : '-3px'};line-height:${isWhatsApp ? '1.1' : '20px'};${isWhatsApp ? '' : 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'}">${escapeHtml(getBudgetItemDescription(item))}</div>` : ''}
            </div>
            <div style="text-align:right;font-weight:500;">$${formatMoney(item.unit_price)}</div>
            <div style="text-align:right;font-weight:500;">$${formatMoney(item.total_price)}</div>
          </div>
        `).join('')}
      </div>

      <div style="position:absolute;bottom:${layout.totalBottom}px;right:60px;${isWhatsApp ? 'height:55px;' : 'min-width:128px;'}display:flex;flex-direction:column;align-items:center;justify-content:center;color:#dc2626;font-weight:700;border:2px solid #dc2626;padding:${isWhatsApp ? '0 25px 12px' : '4px 8px'};background:${isWhatsApp ? '#fff' : 'rgba(255,255,255,.5)'};box-sizing:border-box;z-index:1;">
        <div style="font-size:${isWhatsApp ? '11px' : '14px'};line-height:${isWhatsApp ? '11px' : '18px'};">TOTAL</div>
        <div style="font-size:${isWhatsApp ? '24px' : '20px'};line-height:${isWhatsApp ? '24px' : '20px'};">$${formatMoney(budgetData.total)}</div>
      </div>
    </div>`;
}

export async function prepareBudgetHtml(
  budgetData: Budget,
  profile: BudgetDocumentProfile = 'print'
): Promise<PreparedBudgetHtml> {
  const products = budgetData.budgetProducts || [];
  const chunks: typeof products[] = [];
  for (let index = 0; index < products.length; index += BUDGET_PAGE.itemsPerPage) {
    chunks.push(products.slice(index, index + BUDGET_PAGE.itemsPerPage));
  }
  if (chunks.length === 0) chunks.push([]);

  const hasPreferentialPrice = products.some(product => {
    const originalPrice = getBudgetItemType(product) === 'product'
      ? product.product_price
      : product.template_final_price;
    return originalPrice != null && Math.abs(Number(product.unit_price) - Number(originalPrice)) > 0.01;
  });
  const backgroundImage = await imageToBase64(cotizacionImage);

  const pagesHtml = chunks.map((chunk, index) => buildBudgetPageHtml({
    budgetData,
    products: chunk,
    backgroundImage,
    hasPreferentialPrice,
    pageBreak: index > 0,
    profile,
  })).join('');

  const layout = BUDGET_LAYOUT[profile];
  return {
    pagesHtml,
    pageCount: chunks.length,
    widthPx: layout.widthPx,
    heightPx: layout.heightPx,
  };
}

export function buildBudgetPrintHtml(params: {
  budgetData: Budget;
  pagesHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Presupuesto - ${escapeHtml(params.budgetData.client?.name || params.budgetData.id)}</title>
  <style>
    * { box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,sans-serif!important; }
    @page { size:${BUDGET_PAGE.widthCm}cm ${BUDGET_PAGE.heightCm}cm landscape;margin:0; }
    html,body { margin:0;padding:0; }
    .budget-document-page { width:${BUDGET_PAGE.widthCm}cm!important;height:${BUDGET_PAGE.heightCm}cm!important;page-break-after:always;transform:translateY(${BUDGET_PAGE.printOffsetMm}mm); }
    .budget-document-page:last-child { page-break-after:auto; }
  </style>
</head>
<body>${params.pagesHtml}</body>
</html>`;
}

const waitForDocumentImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error('No se pudo cargar una imagen del presupuesto')), { once: true });
    });
  }));
};

/** Captura todas las páginas como una sola imagen vertical para poder pegarlas con un único Ctrl+V. */
export async function captureBudgetHtmlAsPng(documentHtml: PreparedBudgetHtml): Promise<Blob> {
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:fixed;top:-100000px;left:-100000px;background:#fff;pointer-events:none;';

  const pagesContainer = document.createElement('div');
  pagesContainer.style.cssText = `display:flex;flex-direction:column;gap:${BUDGET_PAGE.captureGapPx}px;width:${documentHtml.widthPx}px;background:#fff;`;
  pagesContainer.innerHTML = documentHtml.pagesHtml;
  offscreenHost.appendChild(pagesContainer);
  document.body.appendChild(offscreenHost);

  try {
    await waitForDocumentImages(pagesContainer);
    const captureHeight = documentHtml.pageCount * documentHtml.heightPx
      + Math.max(0, documentHtml.pageCount - 1) * BUDGET_PAGE.captureGapPx;
    const scale = Math.max(0.25, Math.min(2, 30000 / captureHeight));
    const canvas = await html2canvas(pagesContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale,
      logging: false,
      width: documentHtml.widthPx,
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
