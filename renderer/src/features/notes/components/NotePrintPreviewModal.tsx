import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Note } from '../types';
import {
  buildNotePrintHtml,
  prepareNoteHtml,
  type PreparedNoteHtml,
} from '../utils/buildNotePageHtml';

interface NotePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

const NotePrintPreviewModal: React.FC<NotePrintPreviewModalProps> = ({ isOpen, onClose, note }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedDocument, setPreparedDocument] = useState<PreparedNoteHtml | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isOpen || !note) {
      setPreparedDocument(null);
      return () => { cancelled = true; };
    }

    setPreparedDocument(null);
    setIsPreparing(true);
    prepareNoteHtml(note)
      .then(documentHtml => {
        if (!cancelled) setPreparedDocument(documentHtml);
      })
      .catch(error => {
        console.error('Error al preparar la vista previa de la nota:', error);
        if (!cancelled) toast.error('No se pudo generar la vista previa de la nota');
      })
      .finally(() => {
        if (!cancelled) setIsPreparing(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, note]);

  if (!isOpen || !note) return null;

  const handlePrint = () => {
    if (!preparedDocument) return;
    setIsPrinting(true);

    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('No se pudo abrir la ventana de impresión.');
        return;
      }

      printWindow.document.write(buildNotePrintHtml({
        noteId: note.id,
        pagesHtml: preparedDocument.pagesHtml,
      }));
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        }, 500);
      };
      toast.success('Documento enviado a impresión');
    } catch (error) {
      console.error('Error al imprimir la nota:', error);
      toast.error('Error al generar el documento de impresión');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-60"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Printer className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vista previa - Nota #{note.id}</h2>
              <p className="text-sm text-gray-500">Formato horizontal de medio oficio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePrint}
              disabled={isPrinting || isPreparing || !preparedDocument}
              className="flex items-center gap-2"
            >
              <Printer size={16} />
              {isPrinting ? 'Imprimiendo...' : isPreparing ? 'Preparando...' : 'Imprimir'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X size={16} />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-auto max-h-[calc(95vh-100px)]">
          {isPreparing && !preparedDocument ? (
            <div className="py-16 text-center text-gray-500">Generando vista previa...</div>
          ) : (
            <div
              className="flex flex-col items-center gap-8 [&>.note-document-page]:border [&>.note-document-page]:border-gray-300 [&>.note-document-page]:shadow-lg"
              dangerouslySetInnerHTML={{ __html: preparedDocument?.pagesHtml || '' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotePrintPreviewModal;
