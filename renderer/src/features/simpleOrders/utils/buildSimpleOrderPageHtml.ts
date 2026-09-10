import html2canvas from 'html2canvas';
import notaImage from '@/assets/NOTA.jpg';
import { formatDateMX } from '@/utils/dateUtils';
import type { SimpleOrder } from '../types';

export const SIMPLE_ORDER_PAGE = {
  widthCm: 21.6,
  heightCm: 17,
  widthPx: 816,
  heightPx: 643,
  itemsPerPage: 5,
  captureGapPx: 16,
} as const;

export type SimpleOrderDocumentProfile = 'print' | 'whatsapp';

export interface PreparedSimpleOrderHtml {
  pagesHtml: string;
  pageCount: number;
}

const SIMPLE_ORDER_LAYOUT = {
  print: {
    clientTop: 115,
    clientLeft: 100,
    clientWidth: 288,
    phoneTop: 115,
    phoneLeft: 620,
    phoneWidth: 152,
    contactHeight: 36,
    orderNumberBottom: 35.2,
    thanksBottom: 104,
    paymentMethodBottom: 88,
    totalsBottom: 44,
  },
  whatsapp: {
    clientTop: 112,
    clientLeft: 100,
    clientWidth: 288,
    phoneTop: 112,
    phoneLeft: 620,
    phoneWidth: 152,
    contactHeight: 36,
    orderNumberBottom: 55,
    thanksBottom: 124,
    paymentMethodBottom: 108,
    totalsBottom: 64,
  },
} as const;

interface SimpleOrderProduct {
  quantity: number;
  name: string;
  unitPrice: number;
  totalPrice: number;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value: number): string =>
  Number(value).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

function buildClientHtml(orderData: SimpleOrder, profile: SimpleOrderDocumentProfile): string {
  const layout = SIMPLE_ORDER_LAYOUT[profile];

  return `
    <div style="position:absolute;top:${layout.clientTop}px;left:${layout.clientLeft}px;width:${layout.clientWidth}px;height:${layout.contactHeight}px;display:flex;align-items:center;font-size:18px;line-height:1;font-weight:700;color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
      ${escapeHtml(orderData.client_name || 'Cliente de Mostrador')}
    </div>
    <div style="position:absolute;top:${layout.phoneTop}px;left:${layout.phoneLeft}px;width:${layout.phoneWidth}px;height:${layout.contactHeight}px;display:flex;align-items:center;font-size:18px;line-height:1;font-weight:700;color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
      ${escapeHtml(orderData.client_phone || '')}
    </div>`;
}

function buildPageHtml(params: {
  orderData: SimpleOrder;
  products: SimpleOrderProduct[];
  totalPaid: number;
  balance: number;
  backgroundImage: string;
  pageBreak: boolean;
  profile: SimpleOrderDocumentProfile;
}): string {
  const { orderData, products, totalPaid, balance, backgroundImage, pageBreak, profile } = params;
  const layout = SIMPLE_ORDER_LAYOUT[profile];
  const payments = orderData.payments || [];

  return `
    <div class="simple-order-document-page" style="position:relative;width:${SIMPLE_ORDER_PAGE.widthPx}px;height:${SIMPLE_ORDER_PAGE.heightPx}px;overflow:hidden;background:#fff;flex:none;${pageBreak ? 'page-break-before:always;' : ''}">
      <img src="${backgroundImage}" alt="Fondo" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;" />

      <div style="position:absolute;top:64px;right:16px;font-size:16px;line-height:20px;font-weight:700;color:#000;z-index:1;">
        <div style="display:flex;min-width:255px;align-items:flex-start;">
          <div style="text-align:right;width:115px;">
            <div style="display:flex;gap:16px;">
              <span>${escapeHtml(formatDateMX(orderData.date, 'DD'))}</span>
              <span>${escapeHtml(formatDateMX(orderData.date, 'MM'))}</span>
              <span>${escapeHtml(formatDateMX(orderData.date, 'YYYY'))}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="position:absolute;top:120px;right:232px;font-size:16px;font-weight:700;color:#000;z-index:1;">
        ${escapeHtml(formatDateMX(orderData.date, 'HH:mm'))}
      </div>

      ${buildClientHtml(orderData, profile)}

      <div style="position:absolute;top:144px;left:32px;right:40px;color:#000;z-index:1;">
        <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;font-size:16px;line-height:16px;font-weight:600;margin-bottom:8px;border-bottom:1px solid #9ca3af;padding-bottom:4px;">
          <div style="grid-column:span 1/span 1;text-align:center;">Cant.</div>
          <div style="grid-column:span 7/span 7;text-align:left;">Producto</div>
          <div style="grid-column:span 2/span 2;text-align:right;">P. Unitario</div>
          <div style="grid-column:span 2/span 2;text-align:right;">Total</div>
        </div>
        ${products.map(product => `
          <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px;margin-bottom:8px;font-size:16px;line-height:24px;padding:4px 0;">
            <div style="grid-column:span 1/span 1;text-align:center;">${escapeHtml(product.quantity)}</div>
            <div style="grid-column:span 7/span 7;padding-left:4px;min-width:0;">
              <div style="font-weight:500;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(product.name)}</div>
            </div>
            <div style="grid-column:span 2/span 2;text-align:right;font-weight:500;">${formatMoney(product.unitPrice)}</div>
            <div style="grid-column:span 2/span 2;text-align:right;font-weight:500;">${formatMoney(product.totalPrice)}</div>
          </div>
        `).join('')}
      </div>

      <div style="position:absolute;bottom:${layout.orderNumberBottom}px;right:80px;font-size:20px;line-height:1;font-weight:700;color:#dc2626;text-align:center;z-index:1;">
        No. R-${escapeHtml(orderData.id)}
      </div>

      <div style="position:absolute;bottom:${layout.thanksBottom}px;left:200px;font-size:16px;line-height:1;font-weight:700;color:#0369a1;z-index:1;">
        GRACIAS POR SU COMPRA. LE ATENDIÓ ${escapeHtml(orderData.user?.username || '')}
      </div>

      <div style="position:absolute;bottom:${layout.paymentMethodBottom}px;left:280px;font-size:16px;line-height:1;z-index:1;">
        ${payments.length > 0 ? `Pago realizado con: ${escapeHtml(payments[0]?.descripcion || '')}` : ''}
      </div>

      <div style="position:absolute;bottom:${layout.totalsBottom}px;left:176px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;color:#15803d;font-weight:700;font-size:24px;line-height:1;z-index:1;">
        ${payments.length > 0 ? `$${formatMoney(totalPaid)}` : ''}
      </div>
      <div style="position:absolute;bottom:${layout.totalsBottom}px;left:320px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;color:#dc2626;font-weight:700;font-size:24px;line-height:1;z-index:1;">
        $${formatMoney(Math.max(0, balance))}
      </div>
      <div style="position:absolute;bottom:${layout.totalsBottom}px;left:464px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:24px;line-height:1;z-index:1;">
        $${formatMoney(orderData.total)}
      </div>
    </div>`;
}

export async function prepareSimpleOrderHtml(
  orderData: SimpleOrder,
  profile: SimpleOrderDocumentProfile = 'print'
): Promise<PreparedSimpleOrderHtml> {
  const products: SimpleOrderProduct[] = [{
    quantity: 1,
    name: orderData.concept,
    unitPrice: orderData.total,
    totalPrice: orderData.total,
  }];
  const chunks: SimpleOrderProduct[][] = [];
  for (let index = 0; index < products.length; index += SIMPLE_ORDER_PAGE.itemsPerPage) {
    chunks.push(products.slice(index, index + SIMPLE_ORDER_PAGE.itemsPerPage));
  }
  if (chunks.length === 0) chunks.push([]);

  const payments = orderData.payments || [];
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = orderData.total - totalPaid;
  const backgroundImage = await imageToBase64(notaImage);
  const pagesHtml = chunks.map((chunk, index) => buildPageHtml({
    orderData,
    products: chunk,
    totalPaid,
    balance,
    backgroundImage,
    pageBreak: index > 0,
    profile,
  })).join('');

  return { pagesHtml, pageCount: chunks.length };
}

export function buildSimpleOrderPrintHtml(params: {
  orderId: number;
  pagesHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Orden Rápida #${escapeHtml(params.orderId)}</title>
  <style>
    * { box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:Arial,sans-serif!important; }
    @page { size:${SIMPLE_ORDER_PAGE.widthCm}cm ${SIMPLE_ORDER_PAGE.heightCm}cm landscape;margin:0; }
    html,body { width:${SIMPLE_ORDER_PAGE.widthCm}cm!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;font-size:16px!important; }
    .simple-order-document-page { width:${SIMPLE_ORDER_PAGE.widthCm}cm!important;height:${SIMPLE_ORDER_PAGE.heightCm}cm!important;position:relative!important;margin:0!important;padding:0!important;overflow:hidden!important;page-break-after:always; }
    .simple-order-document-page:last-child { page-break-after:auto; }
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
      image.addEventListener('error', () => reject(new Error('No se pudo cargar una imagen de la orden rápida')), { once: true });
    });
  }));
};

export async function captureSimpleOrderHtmlAsPng(documentHtml: PreparedSimpleOrderHtml): Promise<Blob> {
  const offscreenHost = document.createElement('div');
  offscreenHost.style.cssText = 'position:fixed;top:-100000px;left:-100000px;background:#fff;pointer-events:none;';

  const pagesContainer = document.createElement('div');
  pagesContainer.style.cssText = `display:flex;flex-direction:column;gap:${SIMPLE_ORDER_PAGE.captureGapPx}px;width:${SIMPLE_ORDER_PAGE.widthPx}px;background:#fff;`;
  pagesContainer.innerHTML = documentHtml.pagesHtml;
  offscreenHost.appendChild(pagesContainer);
  document.body.appendChild(offscreenHost);

  try {
    await waitForDocumentImages(pagesContainer);
    const captureHeight = documentHtml.pageCount * SIMPLE_ORDER_PAGE.heightPx
      + Math.max(0, documentHtml.pageCount - 1) * SIMPLE_ORDER_PAGE.captureGapPx;
    const scale = Math.max(0.25, Math.min(2, 30000 / captureHeight));
    const canvas = await html2canvas(pagesContainer, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale,
      logging: false,
      width: SIMPLE_ORDER_PAGE.widthPx,
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
