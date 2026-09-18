import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { SimpleOrder } from '../types';
import {
  captureSimpleOrderHtmlAsPng,
  prepareSimpleOrderHtml,
} from '../utils/buildSimpleOrderPageHtml';

export function useWhatsAppSimpleOrder() {
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [copyingImageId, setCopyingImageId] = useState<number | null>(null);
  const isCopyingImage = copyingImageId !== null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [pendingOrder, setPendingOrder] = useState<SimpleOrder | null>(null);

  const startWhatsAppFlow = (orderData: SimpleOrder) => {
    setMessageText('Se le envía la orden de compra en caso de que extravíe su nota.');
    setPendingOrder(orderData);
    setIsDialogOpen(true);
  };

  const prepareAndCopyImage = async (orderData: SimpleOrder) => {
    const preparedDocument = await prepareSimpleOrderHtml(orderData, 'whatsapp');
    const blob = await captureSimpleOrderHtmlAsPng(preparedDocument);

    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return { preparedDocument, blob, copied: true };
    } catch {
      return { preparedDocument, blob, copied: false };
    }
  };

  const copyImage = async (orderData: SimpleOrder) => {
    setCopyingImageId(orderData.id);

    try {
      const { preparedDocument, copied } = await prepareAndCopyImage(orderData);
      if (!copied) throw new Error('No se pudo escribir la imagen en el portapapeles');

      const pagesLabel = preparedDocument.pageCount === 1
        ? 'La imagen fue copiada al portapapeles'
        : `Las ${preparedDocument.pageCount} páginas fueron copiadas al portapapeles en una sola imagen`;
      toast.success(`${pagesLabel}. Ya puedes pegarla en el chat que prefieras.`);
    } catch (error) {
      console.error('Error al copiar la imagen de la orden rápida:', error);
      toast.error('No se pudo copiar la imagen de la orden rápida al portapapeles.');
    } finally {
      setCopyingImageId(null);
    }
  };

  const confirmAndSend = async () => {
    if (!pendingOrder) return;

    setIsDialogOpen(false);
    setIsSendingWhatsApp(true);

    try {
      const { preparedDocument, blob, copied } = await prepareAndCopyImage(pendingOrder);

      if (copied) {
        const pagesLabel = preparedDocument.pageCount === 1
          ? 'La imagen fue copiada'
          : `Las ${preparedDocument.pageCount} páginas fueron copiadas en una sola imagen`;
        toast.success(`${pagesLabel}. ¡Pégala en WhatsApp con Ctrl+V!`);
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `orden-rapida-R-${pendingOrder.id}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.info('Imagen descargada. Adjúntala manualmente en WhatsApp.');
      }

      const rawPhone = (pendingOrder.client_phone || '').replace(/\D/g, '');
      const phoneWithCountry = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;
      const whatsappUrl = phoneWithCountry
        ? `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(messageText)}`
        : 'https://web.whatsapp.com/';

      if (!phoneWithCountry) {
        toast.warning('El cliente no tiene número registrado. Selecciona el chat manualmente.');
      }
      await window.api.openExternal(whatsappUrl);
    } catch (error) {
      console.error('Error al enviar la orden rápida por WhatsApp:', error);
      toast.error('Ocurrió un error al preparar el envío por WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
      setPendingOrder(null);
    }
  };

  const whatsappDialogElement = isDialogOpen ? (
    <div
      className="fixed inset-0 flex items-center justify-center z-9999"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Mensaje de WhatsApp</h2>
        <p className="text-sm text-gray-500 mb-4">
          Edita el mensaje que se enviará al cliente (orden rápida R-{pendingOrder?.id}).
        </p>
        <textarea
          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25d366] focus:border-transparent resize-none"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
        />
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={confirmAndSend}
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
            disabled={isSendingWhatsApp}
          >
            Generar y Enviar
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    isSendingWhatsApp,
    isCopyingImage,
    copyingImageId,
    sendWhatsApp: startWhatsAppFlow,
    copyImage,
    whatsappDialogElement,
  };
}
