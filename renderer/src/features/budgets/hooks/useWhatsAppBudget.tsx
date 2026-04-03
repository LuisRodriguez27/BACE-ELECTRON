import { useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import cotizacionImage from '@/assets/COTIZACION.jpg';
import { getBudgetItemDisplayName, getBudgetItemDescription, getBudgetItemType, type Budget } from '../types';
import { formatDateMX } from '@/utils/dateUtils';

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

export function useWhatsAppBudget() {
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [pendingArgs, setPendingArgs] = useState<{budgetData: Budget} | null>(null);

  const startWhatsAppFlow = (budgetData: Budget) => {
    const initialText = `Le enviamos la cotización solicitada esperamos vernos favorecidos, será un placer colaborar con usted`;
    setMessageText(initialText);
    setPendingArgs({ budgetData });
    setIsDialogOpen(true);
  };

  const confirmAndSend = async () => {
    if (!pendingArgs) return;
    setIsDialogOpen(false);
    setIsSendingWhatsApp(true);
    let offscreenContainer: HTMLDivElement | null = null;
    const { budgetData } = pendingArgs;

    try {
      // ── Cálculos ──────────────────────────────────────────────────────────
      const productsData = budgetData.budgetProducts || [];
      const hasPreferentialPrice = productsData.some(p => {
        const type = getBudgetItemType(p);
        const orig = type === 'product' ? p.product_price : p.template_final_price;
        return orig !== undefined && orig !== null &&
          Math.abs(Number(p.unit_price) - Number(orig)) > 0.01;
      });

      // ── Imágenes a base64 ─────────────────────────────────────────────────
      const base64Bg = await imageToBase64(cotizacionImage);

      // ── Helper de moneda ──────────────────────────────────────────────────
      const money = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // ── Color del círculo del cliente ─────────────────────────────────────
      const clientCircleColor =
        budgetData.client?.color === 'green'  ? '#22c55e' :
        budgetData.client?.color === 'yellow' ? '#eab308' :
        budgetData.client?.color === 'red'    ? '#ef4444' : null;

      // ── Formateo de fecha ─────────────────────────────────────────────────
      const formattedDate = formatDateMX(budgetData.date, 'DD/MM/YYYY');

      // ── Primeros 5 productos (primera página) ─────────────────────────────
      const firstChunk = productsData.slice(0, 5);

      // ── TEMPLATE PX-BASED (800 × 662 px) ─────────────────────────────────
      const pageHtml = `
        <!-- Fondo de la cotización -->
        <img src="${base64Bg}" alt="Fondo" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;" />

        <!-- Sello precio especial -->
        ${hasPreferentialPrice ? `
        <div style="position:absolute;bottom:64px;right:20px;width:88px;background-color:rgb(220,38,38);color:white;font-weight:bold;font-size:9px;text-align:center;padding:6px;box-sizing:border-box;z-index:10;line-height:1.2;">
          USTED HA ADQUIRIDO UN PRECIO ESPECIAL
        </div>` : ''}

        <!-- Nº de Presupuesto -->
        <div style="position:absolute;top:52px;right:112px;font-size:24px;line-height:1;font-weight:700;color:rgb(220,38,38);">
          ${budgetData.id}
        </div>

        <!-- Cliente, Teléfono y Fecha -->
        <div style="position:absolute;top:118px;left:100px;font-size:16px;line-height:1.8;font-weight:700;color:rgb(0,0,0);">
          <div style="display:grid;grid-template-columns:272px 128px 128px;column-gap:80px;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;min-height:24px;">
              ${clientCircleColor ? `<div style="width:16px;height:16px;border-radius:9999px;background-color:${clientCircleColor};flex-shrink:0;"></div>` : ''}
              <span style="overflow:hidden;text-overflow:ellipsis;">
                ${budgetData.client?.name || 'Cliente no especificado'}
              </span>
            </div>
            <div style="text-align:center;">
              ${budgetData.client?.phone || ''}
            </div>
            <div style="text-align:center;">
              ${formattedDate}
            </div>
          </div>
        </div>

        <!-- Tabla de productos -->
        <div style="position:absolute;top:146px;left:32px;right:40px;color:rgb(0,0,0);">
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
              <div style="font-weight:500;">${getBudgetItemDisplayName(product)}</div>
              ${getBudgetItemDescription(product)
                ? `<div style="font-size:13px; color:rgb(80,90,100); margin-top:1px; line-height:1.1;">${getBudgetItemDescription(product)}</div>`
                : ''}
            </div>
            <div style="text-align:right; font-weight:500;">${money(product.unit_price)}</div>
            <div style="text-align:right; font-weight:500;">${money(product.total_price)}</div>
          </div>`).join('')}
        </div>

        <!-- Total -->
        <div style="
        position: absolute;
        bottom: 35px;
        right: 60px;
        height: 55px; 
        display: flex;
        flex-direction: column;
        align-items: center; 
        justify-content: center; 
        padding: 0 25px 12px 25px; /* <--- Agregamos 12px de espacio abajo para EMPUJAR todo hacia arriba */
        color: rgb(220,38,38);
        font-weight: 700;
        border: 2px solid rgb(220,38,38);
        background-color: white;
        box-sizing: border-box;
      ">
        <div style="font-size: 11px; line-height: 1; text-transform: uppercase; margin: 0;">
          TOTAL
        </div>
        <div style="font-size: 24px; line-height: 1; margin: 0;">
          $${money(budgetData.total)}
        </div>
      </div>
      `;

      // ── Montar en contenedor offscreen 800×662px ───────────────────────────
      offscreenContainer = document.createElement('div');
      offscreenContainer.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:800px;height:662px;overflow:hidden;font-family:Arial,sans-serif;background:#fff;';

      const pageEl = document.createElement('div');
      pageEl.style.cssText = 'position:relative;width:800px;height:662px;overflow:hidden;font-family:Arial,sans-serif;';
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
        width: 800,
        height: 662,
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
        a.download = `presupuesto-${budgetData.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info('Imagen descargada. Adjúntala manualmente en WhatsApp.');
      }

      // ── Abrir WhatsApp ────────────────────────────────────────────────────
      const rawPhone = (budgetData.client?.phone || '').replace(/\D/g, '');
      const phoneWithCountry = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

      let whatsappUrl: string;
      if (phoneWithCountry) {
        whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(messageText)}`;
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

  const WhatsAppDialog = () => {
    if (!isDialogOpen) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center z-9999" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Mensaje de WhatsApp</h2>
          <p className="text-sm text-gray-500 mb-4">Edita el mensaje que se enviará al cliente con su presupuesto.</p>
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
    );
  };

  return { isSendingWhatsApp, sendWhatsApp: startWhatsAppFlow, WhatsAppDialog };
}
