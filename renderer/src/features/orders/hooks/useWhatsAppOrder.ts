import { useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import notaImage from '@/assets/NOTA.jpg';
import specialPriceImage from '@/assets/special-price.png';
import { getOrderItemDisplayName, getOrderItemDescription, getOrderItemType } from '../types';
import { formatDateMX } from '@/utils/dateUtils';

const getDay = (d: string) => formatDateMX(d, 'DD');
const getMonth = (d: string) => formatDateMX(d, 'MM');
const getYear = (d: string) => formatDateMX(d, 'YYYY');
const getHours = (d: string) => formatDateMX(d, 'HH:mm');

const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')?.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });

export function useWhatsAppOrder() {
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const sendWhatsApp = async (
    orderData: any,
    productsData: any[],
    paymentsData: any[]
  ) => {
    setIsSendingWhatsApp(true);
    let offscreenContainer: HTMLDivElement | null = null;

    try {
      // ── Cálculos de pagos ──────────────────────────────────────────────────
      const totalPagos = paymentsData.reduce((sum, p) => sum + p.amount, 0);
      const saldoPendiente = orderData.total - totalPagos;
      const isSaldada = saldoPendiente <= 0.01;

      const hasPreferentialPrice = productsData.some(product => {
        const type = getOrderItemType(product);
        const originalPrice =
          type === 'product' ? product.product_price : product.template_final_price;
        return (
          originalPrice !== undefined &&
          originalPrice !== null &&
          Math.abs(Number(product.unit_price) - Number(originalPrice)) > 0.01
        );
      });

      // ── Imágenes a base64 ─────────────────────────────────────────────────
      const base64Image = await imageToBase64(notaImage);
      const base64SpecialPrice = isSaldada ? await imageToBase64(specialPriceImage) : null;

      // ── HTML inline para la primera página (sin clases Tailwind) ──────────
      const firstChunk = productsData.slice(0, 5);

      const pageHtmlContent = `
        ${hasPreferentialPrice ? `
        <div style="position:absolute;bottom:4rem;right:4.8rem;width:6.5rem;background-color:rgb(220,38,38);color:white;font-weight:bold;font-size:0.55rem;text-align:center;padding:0.35rem 0.25rem;box-sizing:border-box;z-index:10;line-height:1.2;">
          USTED HA ADQUIRIDO UN PRECIO ESPECIAL
        </div>` : ''}

        ${base64SpecialPrice ? `
        <img src="${base64SpecialPrice}" alt="Saldada" style="position:absolute;top:0.5rem;right:0.5rem;width:7rem;height:auto;z-index:10;opacity:0.9;" />` : ''}

        <img src="${base64Image}" alt="Fondo" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;" />

        <div style="position:absolute;top:4rem;right:1rem;font-size:1rem;line-height:1.25rem;font-weight:700;color:rgb(0,0,0);">
          <div style="display:flex;min-width:255px;align-items:flex-start;">
            <div style="text-align:right;width:115px;">
              <div style="display:flex;gap:1rem;">
                <span>${getDay(orderData.date)}</span>
                <span>${getMonth(orderData.date)}</span>
                <span>${getYear(orderData.date)}</span>
              </div>
            </div>
            ${orderData.estimated_delivery_date ? `
            <div style="text-align:right;width:100px;">
              <div style="display:flex;gap:1.25rem;">
                <span>${getDay(orderData.estimated_delivery_date)}</span>
                <span>${getMonth(orderData.estimated_delivery_date)}</span>
                <span>${getYear(orderData.estimated_delivery_date)}</span>
              </div>
            </div>` : ''}
          </div>
        </div>

        <div style="position:absolute;top:7.5rem;right:14.5rem;font-size:1rem;font-weight:700;color:rgb(0,0,0);">
          ${getHours(orderData.date)}
        </div>

        <div style="position:absolute;top:7.5rem;left:6.25rem;font-size:1.25rem;line-height:1;font-weight:700;color:rgb(0,0,0);">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5rem;">
            <div style="grid-column:span 1/span 1;font-size:calc(1em - 2px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:0.5rem;">
              ${orderData.client?.color ? `<div style="width:1rem;height:1rem;border-radius:9999px;background-color:${
                orderData.client.color === 'green' ? '#22c55e' :
                orderData.client.color === 'yellow' ? '#eab308' :
                orderData.client.color === 'red' ? '#ef4444' : 'transparent'
              };flex-shrink:0;"></div>` : ''}
              ${orderData.client?.name || 'Cliente no especificado'}
            </div>
            <div style="grid-column:span 1/span 1;margin-left:10.5rem;">
              ${orderData.client?.phone || ''}
            </div>
          </div>
        </div>

        <div style="position:absolute;top:9rem;left:2rem;right:2.5rem;color:rgb(0,0,0);">
          <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0.5rem;font-size:1rem;line-height:1;font-weight:600;margin-bottom:0.5rem;border-bottom:1px solid rgb(156,163,175);padding-bottom:0.25rem;">
            <div style="grid-column:span 1/span 1;text-align:center;">Cant.</div>
            <div style="grid-column:span 7/span 7;text-align:left;">Producto</div>
            <div style="grid-column:span 2/span 2;text-align:right;">P. Unitario</div>
            <div style="grid-column:span 2/span 2;text-align:right;">Total</div>
          </div>
          ${firstChunk.map(product => `
          <div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:0.5rem;margin-bottom:0.5rem;font-size:1rem;line-height:1.5rem;padding:0.25rem 0;">
            <div style="grid-column:span 1/span 1;text-align:center;">${product.quantity}</div>
            <div style="grid-column:span 7/span 7;padding-left:0.25rem;">
              <div style="font-weight:500;">${getOrderItemDisplayName(product)}</div>
              ${getOrderItemDescription(product) ? `<div style="font-size:0.875rem;color:rgb(70,80,90);margin-top:-0.2rem;line-height:1;">${getOrderItemDescription(product)}</div>` : ''}
            </div>
            <div style="grid-column:span 2/span 2;text-align:right;font-weight:500;">${product.unit_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="grid-column:span 2/span 2;text-align:right;font-weight:500;">${product.total_price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>`).join('')}
        </div>

        ${orderData.description ? `
        <div style="position:absolute;bottom:8.8rem;left:5rem;right:3rem;font-size:1rem;color:rgb(153,27,27);font-weight:700;padding:0.5rem;overflow:hidden;word-break:break-word;line-height:1.2em;">
          ${orderData.description}
        </div>` : ''}

        <div style="position:absolute;bottom:2.2rem;right:5rem;font-size:1.25rem;font-weight:700;color:rgb(220,38,38);text-align:center;">
          No. ${orderData.id}
        </div>

        <div style="position:absolute;bottom:6.5rem;left:12.5rem;font-size:1rem;font-weight:700;color:rgb(3,105,161);">
          GRACIAS POR SU COMPRA. LE ATENDIÓ ${orderData.user?.username || ''}
        </div>

        <div style="position:absolute;bottom:5.5rem;left:17.5rem;font-size:1rem;line-height:1;">
          ${paymentsData.length > 0 ? `Pago realizado con: ${paymentsData[0]?.descripcion || ''}` : ''}
        </div>

        <div style="position:absolute;bottom:2.75rem;left:11rem;width:8rem;height:2rem;display:flex;align-items:center;justify-content:center;color:rgb(21,128,61);font-weight:700;font-size:1.5rem;line-height:1;">
          ${paymentsData.length > 0 ? `$${totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
        </div>

        <div style="position:absolute;bottom:2.75rem;left:20rem;width:8rem;height:2rem;display:flex;align-items:center;justify-content:center;font-weight:700;color:rgb(220,38,38);font-size:1.5rem;line-height:1;">
          $${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <div style="position:absolute;bottom:2.75rem;left:29rem;width:8rem;height:2rem;display:flex;align-items:center;justify-content:center;color:rgb(0,0,0);font-weight:700;font-size:1.5rem;line-height:1;">
          $${orderData.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      `;

      // ── Montar contenedor offscreen (sin clases Tailwind = sin oklch) ──────
      offscreenContainer = document.createElement('div');
      offscreenContainer.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:816px;height:643px;overflow:hidden;font-family:Arial,sans-serif;background:#fff;';

      const pageEl = document.createElement('div');
      pageEl.style.cssText = 'position:relative;width:816px;height:643px;overflow:hidden;';
      pageEl.innerHTML = pageHtmlContent;
      offscreenContainer.appendChild(pageEl);
      document.body.appendChild(offscreenContainer);

      // ── Capturar con html2canvas ──────────────────────────────────────────
      const canvas = await html2canvas(pageEl, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: 816,
        height: 643,
      });

      // ── Copiar al portapapeles como imagen PNG ────────────────────────────
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('No se pudo generar la imagen'));
        }, 'image/png', 1.0);
      });

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('✅ Imagen copiada al portapapeles. ¡Pégala en WhatsApp con Ctrl+V!');
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orden-${orderData.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Imagen descargada. Adjúntala manualmente en WhatsApp.');
      }

      // ── Construir URL de WhatsApp ─────────────────────────────────────────
      const clientName = orderData.client?.name || 'Cliente';
      const total = orderData.total.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const message = `Hola ${clientName} 👋, te compartimos el resumen de tu Orden #${orderData.id} por un total de $${total} MXN. Quedamos a tus órdenes.`;

      const rawPhone = (orderData.client?.phone || '').replace(/\D/g, '');
      const phoneWithCountry = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;
      const encodedMessage = encodeURIComponent(message);

      let whatsappUrl: string;
      if (phoneWithCountry) {
        whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedMessage}`;
      } else {
        whatsappUrl = `https://web.whatsapp.com/`;
        toast.warning('El cliente no tiene número registrado. Selecciona el chat manualmente.');
      }

      // ── Abrir en el navegador predeterminado del sistema ──────────────────
      const api = (window as any).api;
      if (api?.openExternal) {
        await api.openExternal(whatsappUrl);
      } else {
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error al enviar por WhatsApp:', error);
      toast.error('Ocurrió un error al preparar el envío por WhatsApp.');
    } finally {
      if (offscreenContainer && document.body.contains(offscreenContainer)) {
        document.body.removeChild(offscreenContainer);
      }
      setIsSendingWhatsApp(false);
    }
  };

  return { isSendingWhatsApp, sendWhatsApp };
}
