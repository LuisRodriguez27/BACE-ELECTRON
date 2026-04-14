import { useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import notaImage from '@/assets/NOTA.jpg';
import paidStampImage from '@/assets/SELLO-PAGADO.png';
import { getOrderItemDisplayName, getOrderItemDescription, getOrderItemType } from '../types';
import { formatDateMX } from '@/utils/dateUtils';

// ─── Helpers de fecha ────────────────────────────────────────────────────────
const getDay = (d: string) => formatDateMX(d, 'DD');
const getMonth = (d: string) => formatDateMX(d, 'MM');
const getYear = (d: string) => formatDateMX(d, 'YYYY');
const getHours = (d: string) => formatDateMX(d, 'HH:mm');

// ─── Conversión de imágenes a base64 ─────────────────────────────────────────
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [pendingArgs, setPendingArgs] = useState<{
    orderData: any;
    productsData: any[];
    paymentsData: any[];
  } | null>(null);

  const startWhatsAppFlow = (
    orderData: any,
    productsData: any[],
    paymentsData: any[]
  ) => {
    const initialMsg = `Se le envia la orden de compra en caso que extravie su nota.`;
    setMessageText(initialMsg);
    setPendingArgs({ orderData, productsData, paymentsData });
    setIsDialogOpen(true);
  };

  const confirmAndSend = async () => {
    if (!pendingArgs) return;
    setIsDialogOpen(false);
    setIsSendingWhatsApp(true);
    let offscreenContainer: HTMLDivElement | null = null;
    const { orderData, productsData, paymentsData } = pendingArgs;

    try {
      // ── Cálculos ──────────────────────────────────────────────────────────
      const totalPagos = paymentsData.reduce((s, p) => s + p.amount, 0);
      const saldoPendiente = orderData.total - totalPagos;
      const isSaldada = saldoPendiente <= 0.01;

      const hasPreferentialPrice = productsData.some(p => {
        const type = getOrderItemType(p);
        const orig = type === 'product' ? p.product_price : p.template_final_price;
        return orig !== undefined && orig !== null &&
          Math.abs(Number(p.unit_price) - Number(orig)) > 0.01;
      });

      // ── Imágenes a base64 ─────────────────────────────────────────────────
      const base64Bg = await imageToBase64(notaImage);
      const base64Stamp = isSaldada ? await imageToBase64(paidStampImage) : null;

      // ── Helper de moneda ──────────────────────────────────────────────────
      const money = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // ── Color del círculo del cliente ─────────────────────────────────────
      const clientCircleColor =
        orderData.client?.color === 'green' ? '#22c55e' :
          orderData.client?.color === 'yellow' ? '#eab308' :
            orderData.client?.color === 'red' ? '#ef4444' : null;

      // ── Primeros 5 productos (primera página) ─────────────────────────────
      const firstChunk = productsData.slice(0, 5);

      // ── TEMPLATE PX-BASED (816 × 643 px) ─────────────────────────────────
      // Todas las medidas están en px, calibradas para la captura con html2canvas.
      // 1rem = 16px  |  1cm ≈ 37.8px  |  21.6cm=816px  17cm=643px
      const pageHtml = `
        <!-- Sello precio especial -->
        ${hasPreferentialPrice ? `
        <div style="position:absolute;bottom:64px;right:77px;width:104px;background-color:rgb(220,38,38);color:white;font-weight:bold;font-size:9px;text-align:center;padding:1px 4px 8px 4px;box-sizing:border-box;z-index:10;line-height:1.1;">
          USTED HA<br>ADQUIRIDO UN<br>PRECIO ESPECIAL
        </div>` : ''}

        <!-- Sello saldada -->
        ${base64Stamp ? `
        <img src="${base64Stamp}" alt="Saldada" style="position:absolute;top:480px;right:40px;width:112px;height:auto;z-index:10;opacity:0.9;transform:rotate(15deg);" />` : ''}

        <!-- Fondo de la nota -->
        <img src="${base64Bg}" alt="Fondo" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;" />

        <!-- Fechas (orden / entrega) -->
        <div style="position:absolute;top:64px;right:16px;font-size:16px;line-height:20px;font-weight:700;color:rgb(0,0,0);">
          <div style="display:flex;min-width:255px;align-items:flex-start;">
            <div style="text-align:right;width:115px;">
              <div style="display:flex;gap:16px;">
                <span>${getDay(orderData.date)}</span>
                <span>${getMonth(orderData.date)}</span>
                <span>${getYear(orderData.date)}</span>
              </div>
            </div>
            ${orderData.estimated_delivery_date ? `
            <div style="text-align:right;width:100px;">
              <div style="display:flex;gap:20px;">
                <span>${getDay(orderData.estimated_delivery_date)}</span>
                <span>${getMonth(orderData.estimated_delivery_date)}</span>
                <span>${getYear(orderData.estimated_delivery_date)}</span>
              </div>
            </div>` : ''}
          </div>
        </div>

        <!-- Hora -->
        <div style="position:absolute;top:120px;right:232px;font-size:16px;font-weight:700;color:rgb(0,0,0);">
          ${getHours(orderData.date)}
        </div>

        <!-- Cliente y teléfono -->
        <div style="position:absolute;top:112px;left:100px;font-size:20px;line-height:1;font-weight:700;color:rgb(0,0,0);">
          <div style="display:flex;gap:80px;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${clientCircleColor ? `<div style="width:16px;height:16px;border-radius:9999px;background-color:${clientCircleColor};flex-shrink:0;"></div>` : ''}
              <span style="display:flex;align-items:center;height:36px;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${orderData.client?.name || 'Cliente no especificado'}</span>
            </div>
            <div style="margin-left:168px;font-size:18px;height:36px;display:flex;align-items:center;">${orderData.client?.phone || ''}</div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <div style="position:absolute;top:144px;left:32px;right:40px;color:rgb(0,0,0);">
          <!-- Encabezado -->
          <div style="display:grid;grid-template-columns:50px 1fr 90px 90px;gap:8px;font-size:16px;line-height:1;font-weight:600;margin-bottom:0px;border-bottom:1px solid rgb(156,163,175);padding-bottom:12px;">
            <div style="text-align:center;">Cant.</div>
            <div style="text-align:left;">Producto</div>
            <div style="text-align:right;">P. Unit.</div>
            <div style="text-align:right;">Total</div>
          </div>
          <!-- Filas -->
          ${firstChunk.map(product => `
          <div style="display:grid; grid-template-columns:50px 1fr 90px 90px; gap:8px; font-size:16px; line-height:1.2; padding:0 0 6px 0; border-bottom: 1px solid rgb(230,230,230);">
            <div style="text-align:center;">${product.quantity}</div>
            <div style="padding-left:4px;">
              <div style="font-weight:500;">${getOrderItemDisplayName(product)}</div>
              ${getOrderItemDescription(product)
          ? `<div style="font-size:13px; color:rgb(80,90,100); margin-top:1px; line-height:1.1;">${getOrderItemDescription(product)}</div>`
          : ''}
            </div>
            <div style="text-align:right; font-weight:500;">${money(product.unit_price)}</div>
            <div style="text-align:right; font-weight:500;">${money(product.total_price)}</div>
          </div>`).join('')}
        </div>

        <!-- Descripción de la orden -->
        ${orderData.description ? `
        <div style="position:absolute;bottom:145px;left:80px;right:48px;font-size:16px;color:rgb(153,27,27);font-weight:700;padding:8px;overflow:hidden;word-break:break-word;line-height:1.2em;max-height:70px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;">
          ${orderData.description}
        </div>` : ''}

        <!-- Nº de orden -->
        <div style="position:absolute;bottom:55px;right:80px;font-size:20px;line-height:1;font-weight:700;color:rgb(220,38,38);text-align:center;">
          No. ${orderData.id}
        </div>

        <!-- Agradecimiento -->
        <div style="position:absolute;bottom:124px;left:200px;font-size:16px;line-height:1;font-weight:700;color:rgb(3,105,161);">
          GRACIAS POR SU COMPRA. LE ATENDIÓ ${orderData.user?.username || ''}
        </div>

        <!-- Método de pago -->
        <div style="position:absolute;bottom:108px;left:280px;font-size:16px;line-height:1;">
          ${paymentsData.length > 0 ? `Pago realizado con: ${paymentsData[0]?.descripcion || ''}` : ''}
        </div>

        <!-- Monto pagado -->
        <div style="position:absolute;bottom:64px;left:176px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;color:rgb(21,128,61);font-weight:700;font-size:24px;line-height:1;">
          ${paymentsData.length > 0 ? `$${money(totalPagos)}` : ''}
        </div>

        <!-- Saldo pendiente -->
        <div style="position:absolute;bottom:64px;left:320px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;color:rgb(220,38,38);font-size:24px;line-height:1;">
          $${money(saldoPendiente)}
        </div>

        <!-- Total -->
        <div style="position:absolute;bottom:64px;left:464px;width:128px;height:32px;display:flex;align-items:center;justify-content:center;color:rgb(0,0,0);font-weight:700;font-size:24px;line-height:1;">
          $${money(orderData.total)}
        </div>
      `;

      // ── Montar en contenedor offscreen 816×643px ───────────────────────────
      offscreenContainer = document.createElement('div');
      offscreenContainer.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:816px;height:643px;overflow:hidden;font-family:Arial,sans-serif;background:#fff;';

      const pageEl = document.createElement('div');
      pageEl.style.cssText = 'position:relative;width:816px;height:643px;overflow:hidden;font-family:Arial,sans-serif;';
      pageEl.innerHTML = pageHtml;

      offscreenContainer.appendChild(pageEl);
      document.body.appendChild(offscreenContainer);

      // ── Capturar con html2canvas ───────────────────────────────────────────
      const canvas = await html2canvas(pageEl, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: 816,
        height: 643,
      });

      // ── Copiar PNG al portapapeles ─────────────────────────────────────────
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => {
          if (b) resolve(b);
          else reject(new Error('No se pudo generar la imagen PNG'));
        }, 'image/png', 1.0);
      });

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('Imagen copiada. ¡Pégala en WhatsApp con Ctrl+V!');
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orden-${orderData.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Imagen descargada. Adjúntala manualmente en WhatsApp.');
      }

      // ── Abrir WhatsApp ────────────────────────────────────────────────────
      const message = messageText;

      const rawPhone = (orderData.client?.phone || '').replace(/\D/g, '');
      const phoneWithCountry = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

      let whatsappUrl: string;
      if (phoneWithCountry) {
        whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(message)}`;
      } else {
        whatsappUrl = `https://web.whatsapp.com/`;
        toast.warning('El cliente no tiene número registrado. Selecciona el chat manualmente.');
      }

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
      setPendingArgs(null);
    }
  };

  const whatsappDialogElement = isDialogOpen ? (
      <div className="fixed inset-0 flex items-center justify-center z-9999" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Mensaje de WhatsApp</h2>
          <p className="text-sm text-gray-500 mb-4">Edita el mensaje que se enviará al cliente (orden #{pendingArgs?.orderData?.id}).</p>
          <textarea
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25d366] focus:border-transparent resize-none"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAndSend} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white" disabled={isSendingWhatsApp}>Generar y Enviar</Button>
          </div>
        </div>
      </div>
  ) : null;

  return { isSendingWhatsApp, sendWhatsApp: startWhatsAppFlow, whatsappDialogElement };
}
