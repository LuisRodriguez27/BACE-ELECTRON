import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isoToDatetimeLocalMX, nowDatetimeLocalMX } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { useAuthStore } from '@/store/auth';
import { NOTE_STATUSES } from '../types';
import { applyDoubleEnterDivider } from '../noteTextUtils';
import type { Note, CreateNoteForm, UpdateNoteForm } from '../types';

interface Props {
  note: Note | null;
  onClose: () => void;
  onCreate: (data: CreateNoteForm) => Promise<void>;
  onUpdate: (id: number, data: UpdateNoteForm) => Promise<void>;
}

const NoteFormModal: React.FC<Props> = ({ note, onClose, onCreate, onUpdate }) => {
  const { user } = useAuthStore();
  const isEditing = note !== null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [client, setClient] = useState(note?.client ?? '');
  const [phone, setPhone] = useState(note?.phone ?? '');
  const [text, setText] = useState(note?.text ?? '');
  const [date, setDate] = useState(note?.date ? isoToDatetimeLocalMX(note.date) : nowDatetimeLocalMX());
  const [status, setStatus] = useState(note?.status ?? 'Pendiente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (note) {
      setClient(note.client ?? '');
      setPhone(note.phone ?? '');
      setText(note.text ?? '');
      setDate(isoToDatetimeLocalMX(note.date));
      setStatus(note.status);
    }
  }, [note]);

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    const el = e.currentTarget;
    const result = applyDoubleEnterDivider(el.value, el.selectionStart, el.selectionEnd);
    if (!result) return;

    e.preventDefault();
    setText(result.value);
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { setError('La fecha es requerida'); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && note) {
        await onUpdate(note.id, {
          client: client.trim() || null,
          phone: phone.trim() || null,
          text: text.trim() || null,
          date: new Date(date).toISOString(),
          status,
          edited_by: user?.id ?? 0,
        });
      } else {
        await onCreate({
          created_by: user?.id ?? 0,
          client: client.trim() || null,
          phone: phone.trim() || null,
          text: text.trim() || null,
          date: new Date(date).toISOString(),
        });
      }
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <StickyNote size={20} className="text-amber-500" />
            {isEditing ? 'Editar Nota' : 'Nueva Nota'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                type="text"
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Teléfono de contacto (opcional)"
                title="Ingrese hasta 10 dígitos"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0">
            <label className="block text-sm font-medium text-gray-700 mb-1 shrink-0">
              Transcripcion / Productos solicitados
            </label>
            <p className="text-xs text-gray-400 mb-1 shrink-0">
              Escribe cada producto en su propia línea. Presiona Enter dos veces para dividir un producto de otro.
            </p>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleTextKeyDown}
              placeholder={'Vasos color azul 15 c/u\nCaja de vasos 10 c/u\n\nMandiles 35 c/u\n100 mandiles 25 c/u'}
              className="w-full flex-1 min-h-0 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                required
              />
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Note['status'])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none bg-white"
                >
                  {NOTE_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 shrink-0">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading ? 'Guardando...' : isEditing ? 'Actualizar Nota' : 'Crear Nota'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteFormModal;
