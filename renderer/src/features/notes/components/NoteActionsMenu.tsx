import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, Edit3, MoreVertical, Printer, Trash2 } from 'lucide-react';
import type { Note } from '../types';

interface Props {
  note: Note;
  canManage: boolean;
  onPrint: (note: Note) => void;
  onEdit: (note: Note) => void;
  onArchive: (note: Note) => void;
  onDelete: (note: Note) => void;
}

const MENU_WIDTH = 176; // w-44

// Dropdown de acciones por fila, renderizado en un portal a document.body.
// La tabla vive dentro de un contenedor con overflow-hidden (para las esquinas
// redondeadas); si el menú se dibujara como hijo de la fila, en pantallas cortas
// (ej. 720p) quedaba recortado/oculto en vez de flotar sobre la tabla. Al usar un
// portal posicionado con `fixed` a partir del rect del botón, el menú siempre es
// visible, y se voltea hacia arriba cuando no cabe hacia abajo.
const NoteActionsMenu: React.FC<Props> = ({ note, canManage, onPrint, onEdit, onArchive, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  const toggle = () => {
    if (isOpen) { close(); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8) });
    setIsOpen(true);
  };

  // Una vez montado el menú, mide su altura real y lo voltea hacia arriba
  // del botón si no cabe hacia abajo en la ventana visible.
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current || !buttonRef.current) return;
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const fitsBelow = buttonRect.bottom + 4 + menuHeight <= window.innerHeight - 8;
    setPosition(prev => {
      const top = fitsBelow ? buttonRect.bottom + 4 : buttonRect.top - menuHeight - 4;
      if (prev && prev.top === top) return prev;
      return { top, left: prev?.left ?? Math.min(buttonRect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8) };
    });
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => close();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="p-1.5 rounded text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100"
        title="Acciones"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && position && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); close(); }} />
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
            className="bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 text-left"
          >
            <button
              type="button"
              onClick={() => { onPrint(note); close(); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <Printer size={14} className="text-gray-400" />
              Imprimir nota
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => { onEdit(note); close(); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Edit3 size={14} className="text-gray-400" />
                Editar nota
              </button>
            )}
            {canManage && note.status !== 'Archivada' && (
              <button
                type="button"
                onClick={() => { onArchive(note); close(); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Archive size={14} className="text-gray-400" />
                Archivar nota
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => { onDelete(note); close(); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} className="text-red-400" />
                Eliminar nota
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NoteActionsMenu;
