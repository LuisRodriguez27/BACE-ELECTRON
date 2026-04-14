import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import type { Client } from '../types';

export function useWhatsAppClient() {
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [pendingClient, setPendingClient] = useState<Client | null>(null);

  const { user } = useAuthStore();

  const startWhatsAppFlow = (client: Client) => {
    const userName = user?.username || 'un asesor';
    const initialMsg = `BACE Grupo Impresor agradece su preferencia, esperamos atenderle como usted se merece, nuestro compromiso siempre será brindarle el mejor servicio en diseño e impresión le atiende ${userName}`;
    setMessageText(initialMsg);
    setPendingClient(client);
    setIsDialogOpen(true);
  };

  const confirmAndSend = async () => {
    if (!pendingClient) return;
    setIsDialogOpen(false);
    setIsSending(true);

    try {
      const rawPhone = (pendingClient.phone || '').replace(/\D/g, '');
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

      toast.success(`Mensaje de bienvenida enviado a ${pendingClient.name}`);
    } catch (error) {
      console.error('Error al enviar mensaje de bienvenida por WhatsApp:', error);
      toast.error('Ocurrió un error al abrir WhatsApp.');
    } finally {
      setIsSending(false);
      setPendingClient(null);
    }
  };

  const whatsappDialogElement = isDialogOpen ? (
      <div className="fixed inset-0 flex items-center justify-center z-9999" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mensaje de Bienvenida</h2>
              <p className="text-sm text-gray-500">Para: <span className="font-medium text-gray-700">{pendingClient?.name}</span></p>
            </div>
          </div>

          {pendingClient?.phone && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <span>{pendingClient.phone}</span>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-3">Edita el mensaje antes de enviarlo:</p>
          <textarea
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25d366] focus:border-transparent resize-none text-sm"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmAndSend}
              className="bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2"
              disabled={isSending}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      </div>
  ) : null;

  return { isSending, sendWhatsApp: startWhatsAppFlow, whatsappDialogElement };
}
