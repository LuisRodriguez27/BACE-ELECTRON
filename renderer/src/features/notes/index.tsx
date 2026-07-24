import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Edit3, Loader2, MoreVertical, Phone, Plus, Printer, StickyNote, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/store/auth';
import { formatDateMX, nowISO } from '@/utils/dateUtils';
import { extractErrorMessage } from '@/utils/errorHandling';
import { NoteApiService } from './NoteApiService';
import NoteFormModal from './components/NoteFormModal';
import { generateNotePrintHtml } from './logbook';
import type { Note, NoteStatus, Pagination } from './types';

type TabKey = 'all' | NoteStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'Pendiente', label: 'Pendientes' },
  { key: 'Resuelta', label: 'Resueltas' },
  { key: 'Archivada', label: 'Archivadas' },
];

const STATUS_BADGE: Record<NoteStatus, string> = {
  Pendiente: 'bg-amber-100 text-amber-800',
  Resuelta: 'bg-green-100 text-green-800',
  Archivada: 'bg-gray-200 text-gray-600',
};

const NotesPage: React.FC = () => {
  const { checkPermission, canAccess } = usePermissions();
  const { user } = useAuthStore();
  const canManage = canAccess('Gestionar Notas');

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('Pendiente');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [noteToArchive, setNoteToArchive] = useState<Note | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastNoteElementRef = useCallback((node: HTMLTableRowElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasNext) {
        loadMoreNotes();
      }
    });
    if (node) observerRef.current.observe(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, pagination.hasNext]);

  const loadNotes = async (page: number = 1, reset: boolean = true, tab: TabKey = activeTab) => {
    try {
      if (page === 1) setLoading(true); else setLoadingMore(true);

      const status = tab === 'all' ? undefined : tab;
      const response = await NoteApiService.getPaginated(page, 20, status);

      setNotes(prev => reset ? response.data : [...prev, ...response.data]);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(extractErrorMessage(err));
      toast.error('Error al cargar las notas');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreNotes = () => {
    if (!loadingMore && pagination.hasNext) {
      loadNotes(pagination.page + 1, false, activeTab);
    }
  };

  useEffect(() => {
    loadNotes(1, true, activeTab);
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openCreateModal = () => {
    if (!checkPermission('Gestionar Notas')) return;
    setNoteToEdit(null);
    setShowFormModal(true);
  };

  const openEditModal = (note: Note) => {
    if (!checkPermission('Gestionar Notas')) return;
    setNoteToEdit(note);
    setShowFormModal(true);
    setOpenDropdownId(null);
  };

  const handleNoteCreated = () => {
    toast.success('Nota creada exitosamente');
    loadNotes(1, true, activeTab);
  };

  const handleNoteUpdated = (updatedNote: Note) => {
    toast.success('Nota actualizada exitosamente');
    if (activeTab !== 'all' && updatedNote.status !== activeTab) {
      setNotes(prev => prev.filter(n => n.id !== updatedNote.id));
    } else {
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    }
  };

  const openDeleteConfirm = (note: Note) => {
    if (!checkPermission('Gestionar Notas')) return;
    setNoteToDelete(note);
    setOpenDropdownId(null);
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;
    try {
      setIsDeleting(true);
      await NoteApiService.delete(noteToDelete.id);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success('Nota eliminada exitosamente');
      setNoteToDelete(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const openArchiveConfirm = (note: Note) => {
    if (!checkPermission('Gestionar Notas')) return;
    setNoteToArchive(note);
    setOpenDropdownId(null);
  };

  const handleArchiveSingle = async () => {
    if (!noteToArchive || !user) return;
    try {
      setIsArchiving(true);
      await NoteApiService.archiveMany({ ids: [noteToArchive.id], edited_by: user.id });
      setNotes(prev => activeTab === 'Archivada' ? prev : prev.filter(n => n.id !== noteToArchive.id));
      toast.success('Nota archivada exitosamente');
      setNoteToArchive(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0 || !user) return;
    try {
      setIsArchiving(true);
      await NoteApiService.archiveMany({ ids: selectedIds, edited_by: user.id });
      setNotes(prev => prev.filter(n => !selectedIds.includes(n.id)));
      toast.success(`${selectedIds.length} nota${selectedIds.length !== 1 ? 's' : ''} archivada${selectedIds.length !== 1 ? 's' : ''} exitosamente`);
      setSelectedIds([]);
      setShowBulkArchiveConfirm(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePrintNote = (note: Note) => {
    setOpenDropdownId(null);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permite ventanas emergentes para imprimir');
      return;
    }
    const currentDate = formatDateMX(nowISO(), 'dddd, D [de] MMMM [de] YYYY');
    printWindow.document.write(generateNotePrintHtml(note, currentDate));
    printWindow.document.close();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notes.map(n => n.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showCheckboxColumn = canManage && activeTab !== 'Archivada';
  const notaColWidth = showCheckboxColumn ? '33%' : '37%';
  const colSpan = showCheckboxColumn ? 8 : 7;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--app-bg)] flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="text-amber-500" size={24} />
            Bloc de Notas
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Registra consultas de clientes que aún no requieren un presupuesto
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateModal} className="flex items-center gap-2 shrink-0">
            <Plus size={16} />
            Nueva Nota
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex justify-between items-center gap-3">
          <p className="text-red-800 text-sm font-medium">{error}</p>
          <Button onClick={() => loadNotes(1, true, activeTab)} size="sm" variant="destructive">
            Reintentar
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-4 w-full sm:w-fit overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk actions toolbar */}
      {showCheckboxColumn && selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4">
          <p className="text-sm font-medium text-amber-900">
            {selectedIds.length} nota{selectedIds.length !== 1 ? 's' : ''} seleccionada{selectedIds.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
              onClick={() => setShowBulkArchiveConfirm(true)}
            >
              <Archive size={14} />
              Archivar seleccionadas
            </Button>
          </div>
        </div>
      )}

      {/* Table — table-fixed con anchos en % para que nunca necesite scroll horizontal */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              {showCheckboxColumn && (
                <th className="py-3 px-4" style={{ width: '4%' }}>
                  <Checkbox
                    checked={notes.length > 0 && selectedIds.length === notes.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
              )}
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: '6%' }}>ID</th>
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: '11%' }}>Fecha</th>
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: '16%' }}>Cliente</th>
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: notaColWidth }}>Nota</th>
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: '10%' }}>Creado por</th>
              <th className="py-3 px-4 font-semibold uppercase" style={{ width: '10%' }}>Estado</th>
              <th className="py-3 px-4 font-semibold uppercase text-center" style={{ width: '10%' }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {loading && notes.length === 0 && (
              [...Array(4)].map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  {showCheckboxColumn && <td className="py-4 px-4"><div className="h-4 w-4 bg-gray-200 rounded" /></td>}
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-full max-w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-full max-w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-full" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-full max-w-20" /></td>
                  <td className="py-4 px-4"><div className="h-6 bg-gray-200 rounded-full w-20" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-8 bg-gray-200 rounded w-8 inline-block" /></td>
                </tr>
              ))
            )}

            {!loading && notes.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-gray-500">
                  <StickyNote className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  No hay notas {activeTab !== 'all' ? `en estado "${TABS.find(t => t.key === activeTab)?.label}"` : 'registradas'}
                </td>
              </tr>
            )}

            {notes.map((note, index) => {
              const isLast = index === notes.length - 1;
              return (
                <tr
                  key={note.id}
                  ref={isLast ? lastNoteElementRef : null}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {showCheckboxColumn && (
                    <td className="py-3 px-4">
                      <Checkbox
                        checked={selectedIds.includes(note.id)}
                        onCheckedChange={() => toggleSelectOne(note.id)}
                      />
                    </td>
                  )}
                  <td className="py-3 px-4 text-gray-900 font-medium truncate">#{note.id}</td>
                  <td className="py-3 px-4 text-gray-500 truncate">{formatDateMX(note.date)}</td>
                  <td className="py-3 px-4 text-gray-900 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate" title={note.client || undefined}>{note.client || '-'}</span>
                    </div>
                    {note.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 min-w-0">
                        <Phone size={11} className="shrink-0" />
                        <span className="truncate">{note.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600 min-w-0">
                    <p className="truncate" title={note.text || undefined}>{note.text || '-'}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-500 truncate">{note.created_by_username || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-xs font-medium ${STATUS_BADGE[note.status]}`}>
                      {note.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center relative">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === note.id ? null : note.id);
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100"
                        title="Acciones"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openDropdownId === note.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                          />
                          <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-40 origin-top-right text-left">
                            <button
                              type="button"
                              onClick={() => handlePrintNote(note)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Printer size={14} className="text-gray-400" />
                              Imprimir nota
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => openEditModal(note)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit3 size={14} className="text-gray-400" />
                                Editar nota
                              </button>
                            )}
                            {canManage && note.status !== 'Archivada' && (
                              <button
                                type="button"
                                onClick={() => openArchiveConfirm(note)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Archive size={14} className="text-gray-400" />
                                Archivar nota
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => openDeleteConfirm(note)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} className="text-red-400" />
                                Eliminar nota
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {loadingMore && (
              <tr className="animate-pulse bg-gray-50">
                <td colSpan={colSpan} className="py-4 text-center text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando más notas...
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* End of list message */}
      {!loading && !loadingMore && notes.length > 0 && !pagination.hasNext && (
        <div className="text-center text-xs text-gray-400 my-4">
          Has visto todas las notas ({pagination.total})
        </div>
      )}

      {/* Create/Edit Modal */}
      {showFormModal && (
        <NoteFormModal
          note={noteToEdit}
          onClose={() => { setShowFormModal(false); setNoteToEdit(null); }}
          onCreate={async (data) => { await NoteApiService.create(data); handleNoteCreated(); }}
          onUpdate={async (id, data) => { const updated = await NoteApiService.update(id, data); handleNoteUpdated(updated); }}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar Nota"
        message={`¿Seguro que quieres eliminar la nota #${noteToDelete?.id}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Single archive confirmation */}
      <ConfirmDialog
        isOpen={!!noteToArchive}
        onClose={() => setNoteToArchive(null)}
        onConfirm={handleArchiveSingle}
        title="Archivar Nota"
        message={`¿Archivar la nota #${noteToArchive?.id}? Podrás encontrarla en la pestaña "Archivadas".`}
        confirmText="Archivar"
        type="warning"
        isLoading={isArchiving}
      />

      {/* Bulk archive confirmation */}
      <ConfirmDialog
        isOpen={showBulkArchiveConfirm}
        onClose={() => setShowBulkArchiveConfirm(false)}
        onConfirm={handleArchiveSelected}
        title="Archivar Notas"
        message={`¿Archivar ${selectedIds.length} nota${selectedIds.length !== 1 ? 's' : ''} seleccionada${selectedIds.length !== 1 ? 's' : ''}?`}
        confirmText="Archivar"
        type="warning"
        isLoading={isArchiving}
      />
    </div>
  );
};

export default NotesPage;
