import html2canvas from 'html2canvas';
import notaImage from '@/assets/NOTA.jpg';
import paidStampImage from '@/assets/SELLO-PAGADO.png';
import {
  getOrderItemDisplayName,
  getOrderItemDescription,
  getOrderItemType,
  type Order,
  type OrderProduct,
} from '../types';
import type { Payment } from '@/features/payments/types';
import { formatDateMX, formatDateOnlyMX } from '@/utils/dateUtils';

export const ORDER_PAGE = {
  widthCm: 21.6,
  heightCm: 17,
  widthPx: 816,
  heightPx: 643,
  itemsPerPage: 5,
  captureGapPx: 16,
} as const;

export interface PreparedOrderHtml {
  pagesHtml: string;
  pageCount: number;
}

export type OrderDocumentProfile = 'print' | 'whatsapp';

const ORDER_LAYOUT = {
  print: {
    clientTop: 120,
    descriptionBottom: 140.8,
    orderNumberBottom: 35.2,
    thanksBottom: 104,
    paymentMethodBottom: 88,
    totalsBottom: 44,
  },
  whatsapp: {
    clientTop: 112,
    descriptionBottom: 145,
    orderNumberBottom: 55,
    thanksBottom: 124,
    paymentMethodBottom: 108,
    totalsBottom: 64,
  },
} as const;

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getDay = (d: string) => formatDateMX(d, 'DD');
const getMonth = (d: string) => formatDateMX(d, 'MM');
const getYear = (d: string) => formatDateMX(d, 'YYYY');
const getHours = (d: string) => formatDateMX(d, 'HH:mm');
// Para estimated_delivery_date (UTC midnight) – no aplicar offset de timezone
const getDayUTC = (d: string) => formatDateOnlyMX(d, 'DD');
const getMonthUTC = (d: string) => formatDateOnlyMX(d, 'MM');
const getYearUTC = (d: string) => formatDateOnlyMX(d, 'YYYY');

// ── Convierte una URL de imagen local a base64 ─────────────────────────────
const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });

// ── Genera el HTML de UNA página de la nota ───────────────────────────────
function buildPageHtml(params: {
  chunkProducts: OrderProduct[];
  isLastPage: boolean;
  pageBreak: boolean;
  orderData: Order;
  paymentsData: Payment[];
  totalPagos: number;
  saldoPendiente: number;
  hasPreferentialPrice: boolean;
  base64Image: string;
  base64SpecialPrice: string | null;
  profile: OrderDocumentProfile;
}): string {
  const {
    chunkProducts,
    isLastPage,
    pageBreak,
    orderData,
    paymentsData,
    totalPagos,
    saldoPendiente,
    hasPreferentialPrice,
    base64Image,
    base64SpecialPrice,
    profile,
  } = params;
  const layout = ORDER_LAYOUT[profile];
  const isWhatsApp = profile === 'whatsapp';

  return `
    <div class="print-container" style="position: relative; width: ${ORDER_PAGE.widthPx}px; height: ${ORDER_PAGE.heightPx}px; overflow: hidden; background: white; flex: none; ${pageBreak ? 'page-break-before: always;' : ''}">
        ${hasPreferentialPrice ? `
        <!-- Sello de precio especial -->
        <div style="position: absolute; bottom: 4rem; right: 4.8rem; width: 6.5rem; background-color: rgb(220, 38, 38); color: white; font-weight: bold; font-size: 0.55rem; text-align: center; padding: 0.35rem 0.25rem; box-sizing: border-box; z-index: 10; line-height: 1.2;">
          USTED HA ADQUIRIDO UN PRECIO ESPECIAL
        </div>
        ` : ''}

        ${base64SpecialPrice ? `
        <!-- Sello de saldada -->
        <img src="${base64SpecialPrice}" alt="Saldada" style="position: absolute; top: 30rem; right: 2.5rem; width: 7rem; height: auto; z-index: 10; opacity: 0.9; transform: rotate(15deg);" />
        ` : ''}

        <!-- Imagen de fondo -->
        <img src="${base64Image}" alt="Fondo" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" />

        <!-- Fechas en dos columnas -->
        <div style="position: absolute; top: 4rem; right: 1rem; font-size: 1rem; line-height: 1.25rem; font-weight: 700; color: rgb(0, 0, 0);">
            <div style="display: flex; min-width: 255px; align-items: flex-start;">
                <div style="text-align: right; width: 115px;">
                    <div style="display: flex; gap: 1rem;">
                        <span>${escapeHtml(getDay(orderData.date))}</span>
                        <span>${escapeHtml(getMonth(orderData.date))}</span>
                        <span>${escapeHtml(getYear(orderData.date))}</span>
                    </div>
                </div>
                ${orderData.estimated_delivery_date ? `
                <div style="text-align: right; width: 100px;">
                    <div style="display: flex; gap: 1.25rem;">
                        <span>${escapeHtml(getDayUTC(orderData.estimated_delivery_date))}</span>
                        <span>${escapeHtml(getMonthUTC(orderData.estimated_delivery_date))}</span>
                        <span>${escapeHtml(getYearUTC(orderData.estimated_delivery_date))}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Hora de la orden -->
        <div style="position: absolute; top: 7.5rem; right: 14.5rem; font-size: 1rem; font-weight: 700; color: rgb(0,0,0);">
            ${escapeHtml(getHours(orderData.date))}
        </div>

        <!-- Cliente -->
        <div style="position: absolute; top: ${layout.clientTop}px; left: 6.25rem; width: 18rem; ${isWhatsApp ? 'height: 36px;' : ''} font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(0, 0, 0); display: flex; align-items: center; gap: 0.5rem;">
            ${orderData.client?.color
      ? `<div style="width: 1rem; height: 1rem; border-radius: 9999px; background-color: ${orderData.client.color === 'green' ? '#22c55e' :
        orderData.client.color === 'yellow' ? '#eab308' :
          orderData.client.color === 'red' ? '#ef4444' : 'transparent'
      }; flex-shrink: 0;"></div>`
      : ''}
            <span style="font-size: calc(1em - 2px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: ${isWhatsApp ? 'flex' : 'block'}; align-items: center; ${isWhatsApp ? 'height: 36px;' : ''} width: 100%;">
                ${escapeHtml(orderData.client?.name || 'Cliente no especificado')}
            </span>
        </div>

        <!-- Teléfono -->
        <div style="position: absolute; top: ${layout.clientTop}px; left: 38.75rem; width: 9.5rem; ${isWhatsApp ? 'height: 36px; display: flex; align-items: center; font-size: 18px;' : 'font-size: 1.25rem;'} line-height: 1; font-weight: 700; color: rgb(0, 0, 0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(orderData.client?.phone || '')}
        </div>

        <!-- Productos en formato de tabla -->
        <div style="position: absolute; top: 9rem; left: 2rem; right: 2.5rem; color: rgb(0, 0, 0);">
            <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; font-size: 1rem; line-height: 1; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid rgb(156, 163, 175); padding-bottom: 0.25rem;">
                <div style="grid-column: span 1 / span 1; text-align: center;">Cant.</div>
                <div style="grid-column: span 7 / span 7; text-align: left;">Producto</div>
                <div style="grid-column: span 2 / span 2; text-align: right;">P. Unitario</div>
                <div style="grid-column: span 2 / span 2; text-align: right;">Total</div>
            </div>
            ${chunkProducts.map(product => `
                <div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.5rem; font-size: 1rem; line-height: 1.5rem; padding-top: 0.25rem; padding-bottom: 0.25rem;">
                    <div style="grid-column: span 1 / span 1; text-align: center;">${escapeHtml(product.quantity)}</div>
                    <div style="grid-column: span 7 / span 7; padding-left: 0.25rem;">
                        <div style="font-weight: 500;">
                          ${escapeHtml(getOrderItemDisplayName(product))}
                        </div>
                        <div>
                          ${getOrderItemDescription(product)
          ? `<div style="font-size: 0.875rem; color: rgb(70, 80, 90); margin-top: -0.2rem; line-height: 1;">
                                ${escapeHtml(getOrderItemDescription(product))}
                               </div>`
          : ''}
                        </div>
                    </div>
                    <div style="grid-column: span 2 / span 2; text-align: right; font-weight: 500;">${product.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style="grid-column: span 2 / span 2; text-align: right; font-weight: 500;">${product.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            `).join('')}
        </div>

        ${isLastPage && orderData.description ? `
        <!-- Descripción de la orden -->
        <div style="position: absolute; bottom: ${layout.descriptionBottom}px; left: 5rem; right: 3rem; font-size: 1rem; color: rgb(153, 27, 27); font-weight: 700; padding: 0.5rem; border-radius: 0.25rem; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; line-height: 1.2em; max-height: 4.2em;">
            ${escapeHtml(orderData.description)}
        </div>
        ` : ''}

        <div>
            <!-- Número de Orden en la parte inferior derecha -->
            <div style="position: absolute; bottom: ${layout.orderNumberBottom}px; right: 5rem; font-size: 1.25rem; line-height: 1; font-weight: 700; color: rgb(220, 38, 38); text-align: center;">
                No. ${escapeHtml(orderData.id)}
            </div>
        </div>

        <!-- Mensaje de agradecimiento y usuario -->
        <div style="position: absolute; bottom: ${layout.thanksBottom}px; left: 12.5rem; font-size: 1rem; line-height: 1; font-weight: 700; color: rgb(3, 105, 161);">
            GRACIAS POR SU COMPRA. LE ATENDIÓ ${escapeHtml(orderData.user?.username || '')}
        </div>

        <!-- Método de pago -->
        <div style="position: absolute; bottom: ${layout.paymentMethodBottom}px; left: 17.5rem; font-size: 1rem; line-height: 1;">
            ${paymentsData.length > 0 ? `Pago realizado con: ${escapeHtml(paymentsData[0]?.descripcion || '')}` : ''}
        </div>

        <!-- Pagos -->
        <div style="position: absolute; bottom: ${layout.totalsBottom}px; left: 11rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; color: rgb(21, 128, 61); font-weight: 700; font-size: 1.5rem; line-height: 1;">
            ${paymentsData.length > 0 ? `$${totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
        </div>

        <!-- Saldo -->
        <div style="position: absolute; bottom: ${layout.totalsBottom}px; left: 20rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; font-weight: 700; color: rgb(220, 38, 38); font-size: 1.5rem; line-height: 1;">
            $${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <!-- Total -->
        <div style="position: absolute; bottom: ${layout.totalsBottom}px; left: 29rem; width: 8rem; height: 2rem; display: flex; align-items: center; justify-content: center; color: rgb(0, 0, 0); font-weight: 700; font-size: 1.5rem; line-height: 1;">
            $${orderData.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
    </div>`;
}

// ── CSS compartido para impresión y captura de imagen ─────────────────────
const PRINT_STYLES = `
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        font-family: Arial, sans-serif !important;
    }
    html {
        font-size: 16px !important;
    }
    @page {
        size: ${ORDER_PAGE.widthCm}cm ${ORDER_PAGE.heightCm}cm landscape;
        margin: 0;
    }
    @media print {
        html {
            font-size: 16px !important;
        }
        html, body {
            width: ${ORDER_PAGE.widthCm}cm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
        }
        .print-container {
            width: ${ORDER_PAGE.widthCm}cm !important;
            height: ${ORDER_PAGE.heightCm}cm !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        .background-image {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            z-index: -1 !important;
        }
    }
    body {
        width: ${ORDER_PAGE.widthCm}cm;
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
    }
    .print-container {
        width: ${ORDER_PAGE.widthPx}px;
        height: ${ORDER_PAGE.heightPx}px;
        position: relative;
        overflow: hidden;
    }
    .background-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: -1;
    }
`;

// ── Builds the complete affordable HTML document ───────────────────────────
export function buildPrintHtml(params: {
  orderId: number;
  pagesHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden #${params.orderId}</title>
    <style>${PRINT_STYLES}</style>
</head>
<body>
    ${params.pagesHtml}
</body>
</html>`;
}

// ── Función principal: prepara base64s y genera HTML de todas las páginas ──
export async function prepareOrderHtml(
  orderData: Order,
  productsData: OrderProduct[],
  paymentsData: Payment[],
  profile: OrderDocumentProfile = 'print'
): Promise<PreparedOrderHtml> {
  const chunks: OrderProduct[][] = [];
  for (let i = 0; i < productsData.length; i += ORDER_PAGE.itemsPerPage) {
    chunks.push(productsData.slice(i, i + ORDER_PAGE.itemsPerPage));
  }
  if (chunks.length === 0) chunks.push([]);

  const totalPagos = paymentsData.reduce((s, p) => s + p.amount, 0);
  const saldoPendiente = orderData.total - totalPagos;
  const isSaldada = saldoPendiente <= 0.01;

  const hasPreferentialPrice = productsData.some(product => {
    const type = getOrderItemType(product);
    const originalPrice = type === 'product' ? product.product_price : product.template_final_price;
    return originalPrice !== undefined && originalPrice !== null &&
      Math.abs(Number(product.unit_price) - Number(originalPrice)) > 0.01;
  });

  const base64Image = await imageToBase64(notaImage);
  const base64SpecialPrice = isSaldada ? await imageToBase64(paidStampImage) : null;

  const commonParams = {
    orderData,
    paymentsData,
    totalPagos,
    saldoPendiente,
    hasPreferentialPrice,
    base64Image,
    base64SpecialPrice,
    profile,
  };

  const pagesHtml = chunks.map((chunk, i) =>
    buildPageHtml({ chunkProducts: chunk, isLastPage: i === chunks.length - 1, pageBreak: i > 0, ...commonParams })
  ).join('');

  return { pagesHtml, pageCount: chunks.length };
}

const waitForDocumentImages = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => reject(new Error('No se pudo cargar una imagen de la orden')), { once: true });
    });
  }));
};

/** Captura todas las páginas como una sola imagen vertical para poder pegarlas con un único Ctrl+V. */
export async function captureOrderHtmlAsPng(documentHtml: PreparedOrderHtml): Promise<Blob> {
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:fixed;top:-100000px;left:-100000px;background:#fff;pointer-events:none;';

  const pagesContainer = document.createElement('div');
  pagesContainer.style.cssText = `display:flex;flex-direction:column;gap:${ORDER_PAGE.captureGapPx}px;width:${ORDER_PAGE.widthPx}px;background:#fff;`;
  pagesContainer.innerHTML = documentHtml.pagesHtml;
  offscreenHost.appendChild(pagesContainer);
  document.body.appendChild(offscreenHost);

  try {
    await waitForDocumentImages(pagesContainer);
    const captureHeight = documentHtml.pageCount * ORDER_PAGE.heightPx
      + Math.max(0, documentHtml.pageCount - 1) * ORDER_PAGE.captureGapPx;
    // Chromium limita la altura máxima del canvas. Se conserva escala 2 salvo en órdenes excepcionalmente largas.
    const scale = Math.max(0.25, Math.min(2, 30000 / captureHeight));
    const canvas = await html2canvas(pagesContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale,
      logging: false,
      width: ORDER_PAGE.widthPx,
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
