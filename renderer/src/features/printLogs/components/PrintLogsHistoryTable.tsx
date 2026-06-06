import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  Check, 
  Loader, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit3,
  X,
  Printer
} from 'lucide-react';
import { PrintLogsApiService } from '../PrintLogsApiService';
import { extractErrorMessage } from '@/utils/errorHandling';
import type { PaginatedHistoryDays, PrintLog, PrintLogsTableRef } from '../types';
import { formatDateMX, formatDateHeaderMX, todayDateInputMX } from '@/utils/dateUtils';
import { generatePrintLogbookHtml } from '../logbook';


interface PrintLogsHistoryTableProps {
  onEditClick: (log: PrintLog) => void;
}

const PrintLogsHistoryTable = forwardRef<PrintLogsTableRef, PrintLogsHistoryTableProps>(
  ({ onEditClick }, ref) => {
    const [historyData, setHistoryData] = useState<PaginatedHistoryDays | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLimit] = useState(12); // Grid size (multiple of 3 is nice)
    const [searchTerm, setSearchTerm] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Day detail modal state
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedDayLogs, setSelectedDayLogs] = useState<PrintLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);

    const todayLocalStr = todayDateInputMX();

    const handlePrintGroup = (logs: PrintLog[], dateStr: string) => {
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Por favor permite ventanas emergentes para imprimir');
          return;
        }

        const htmlContent = generatePrintLogbookHtml(logs, dateStr);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } catch (err) {
        console.error('Error printing group:', err);
      }
    };

    const handlePrintFromCard = async (e: React.MouseEvent, dateStr: string) => {
      e.stopPropagation(); // Avoid opening the modal
      try {
        const logs = await PrintLogsApiService.getByDay(dateStr);
        handlePrintGroup(logs, dateStr);
      } catch (err) {
        console.error('Error fetching print logs for day print:', err);
        alert('Error al obtener los registros para imprimir: ' + extractErrorMessage(err));
      }
    };

    const fetchHistoryDays = async (page: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await PrintLogsApiService.getHistoryDays(
          todayLocalStr,
          page,
          historyLimit,
          searchTerm,
          searchDate || null
        );
        setHistoryData(data);
        setHistoryPage(page);
      } catch (err) {
        console.error('Error fetching history days:', err);
        setError(extractErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    const fetchDayLogs = async (dateStr: string) => {
      try {
        setIsLoadingLogs(true);
        setLogsError(null);
        const logs = await PrintLogsApiService.getByDay(dateStr);
        setSelectedDayLogs(logs);
      } catch (err) {
        console.error('Error fetching print logs for day:', err);
        setLogsError(extractErrorMessage(err));
      } finally {
        setIsLoadingLogs(false);
      }
    };

    useEffect(() => {
      fetchHistoryDays(1);
    }, []);

    useEffect(() => {
      if (selectedDay) {
        fetchDayLogs(selectedDay);
      } else {
        setSelectedDayLogs([]);
      }
    }, [selectedDay]);

    const handleCheckboxChange = async (
      logId: number,
      value: boolean
    ) => {
      try {
        // Optimistic UI update in modal logs list
        setSelectedDayLogs(prev => {
          const nextLogs = prev.map(log => 
            log.id === logId ? { ...log, completado: value } : log
          );

          // Recompute all_completed for this day in the cards list
          const allCompleted = nextLogs.every(log => log.completado);
          setHistoryData(hPrev => {
            if (!hPrev) return null;
            return {
              ...hPrev,
              data: hPrev.data.map(day => 
                day.log_date === selectedDay 
                  ? { ...day, all_completed: allCompleted } 
                  : day
              )
            };
          });

          return nextLogs;
        });

        await PrintLogsApiService.updateCheckboxes(logId, { completado: value });
      } catch (err) {
        console.error('Error updating checkbox in history logs:', err);
        // Revert on error
        if (selectedDay) {
          fetchDayLogs(selectedDay);
        }
      }
    };

    // Expose functions to parent
    useImperativeHandle(ref, () => ({
      refresh: () => {
        fetchHistoryDays(historyPage);
        if (selectedDay) {
          fetchDayLogs(selectedDay);
        }
      },
      handleLogUpdated: (updatedLog: PrintLog) => {
        // If the modal for a specific day is open and the log is part of it, update it
        if (selectedDay && selectedDayLogs.some(log => log.id === updatedLog.id)) {
          setSelectedDayLogs(prev => {
            const nextLogs = prev.map(log => log.id === updatedLog.id ? updatedLog : log);
            
            // Recompute all_completed for this day in the cards list
            const allCompleted = nextLogs.every(log => log.completado);
            setHistoryData(hPrev => {
              if (!hPrev) return null;
              return {
                ...hPrev,
                data: hPrev.data.map(day => 
                  day.log_date === selectedDay 
                    ? { ...day, all_completed: allCompleted } 
                    : day
                )
              };
            });
            
            return nextLogs;
          });
        }
      }
    }));

    const formatTimeStr = (isoString: string) => {
      try {
        return formatDateMX(isoString, 'hh:mm A');
      } catch (e) {
        return '-';
      }
    };

    const formatCurrency = (val: number | null) => {
      if (val === null || val === undefined) return '-';
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
    };

    return (
      <div className="space-y-6">
        {/* Filters Card */}
        <Card className="shadow-sm border border-gray-200 bg-white">
          <CardHeader className="bg-gray-50 py-5 px-6 border-b border-gray-200">
            <form 
              onSubmit={(e) => { e.preventDefault(); fetchHistoryDays(1); }}
              className="flex flex-col md:flex-row md:items-end gap-4"
            >
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search_input" className="text-xs font-bold text-gray-700 uppercase">
                  Buscar por ID Impresión / ID Orden / Cliente
                </Label>
                <div className="mt-1.5 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="search_input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: 1425"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-52">
                <Label htmlFor="search_date" className="text-xs font-bold text-gray-700 uppercase">
                  Fecha Exacta
                </Label>
                <div className="mt-1.5 relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="search_date"
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="font-medium flex items-center gap-2"
                >
                  <Search size={16} />
                  Buscar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchDate('');
                    setTimeout(() => {
                      fetchHistoryDays(1);
                    }, 0);
                  }}
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </CardHeader>
        </Card>

        {/* Content Section */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            <p className="font-medium">Ha ocurrido un error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : !historyData || historyData.data.length === 0 ? (
          <Card className="border-dashed bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-semibold text-gray-700">Sin Resultados</h3>
              <p className="text-gray-500 text-sm max-w-sm mt-1">
                No se encontraron días en el historial que coincidan con los filtros seleccionados.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyData.data.map((day) => (
                <div
                  key={day.log_date}
                  onClick={() => setSelectedDay(day.log_date)}
                  className="hover:-translate-y-1 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md border border-gray-200 rounded-xl bg-white p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Calendar size={20} />
                      </span>
                      {day.all_completed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          <Check size={12} className="stroke-[3]" />
                          Finalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                          Pendientes
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">
                      {formatDateHeaderMX(day.log_date)}
                    </h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>{day.total_logs} {day.total_logs === 1 ? 'impresión' : 'impresiones'}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        onClick={(e) => handlePrintFromCard(e, day.log_date)}
                        title="Imprimir esta bitácora"
                      >
                        <Printer size={15} />
                      </Button>
                      <span className="text-blue-600 font-semibold hover:underline">Ver detalles &rarr;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {historyData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                <div className="text-sm text-gray-500">
                  Mostrando página <span className="font-semibold text-gray-900">{historyData.pagination.page}</span> de{' '}
                  <span className="font-semibold text-gray-900">{historyData.pagination.totalPages}</span>{' '}
                  ({historyData.pagination.total} días en total)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistoryDays(historyPage - 1)}
                    disabled={!historyData.pagination.hasPrev}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </Button>
                  
                  {Array.from({ length: historyData.pagination.totalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - historyPage) <= 2 || p === 1 || p === historyData.pagination.totalPages)
                    .map((p, idx, arr) => {
                      const isCurrent = p === historyPage;
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && p - prevPage > 1;

                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="text-gray-400">...</span>}
                          <Button
                            size="sm"
                            variant={isCurrent ? "default" : "outline"}
                            onClick={() => fetchHistoryDays(p)}
                            className={isCurrent ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                          >
                            {p}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistoryDays(historyPage + 1)}
                    disabled={!historyData.pagination.hasNext}
                    className="flex items-center gap-1"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Day Details Modal */}
        {selectedDay && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Impresiones del {formatDateHeaderMX(selectedDay)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Detalles y control de estados para este día
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => handlePrintGroup(selectedDayLogs, selectedDay)}
                    title="Imprimir esta bitácora"
                    disabled={selectedDayLogs.length === 0 || isLoadingLogs}
                  >
                    <Printer size={16} />
                    Imprimir
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedDay(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X size={18} />
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-6 flex-1 bg-white">
                {logsError && (
                  <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                    <p className="font-medium">Error al cargar registros</p>
                    <p className="text-sm mt-1">{logsError}</p>
                  </div>
                )}

                {isLoadingLogs ? (
                  <div className="flex justify-center py-16">
                    <Loader className="animate-spin text-blue-600" size={32} />
                  </div>
                ) : selectedDayLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No se encontraron registros para este día.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-600 border-collapse">
                      <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200 uppercase">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">ID</th>
                          <th className="py-3 px-4 w-24 text-center">Orden</th>
                          <th className="py-3 px-4">Descripción / Cliente</th>
                          <th className="py-3 px-4 w-32">Hora Ent.</th>
                          <th className="py-3 px-4 w-20 text-center">Maq</th>
                          <th className="py-3 px-4 w-20 text-center">Most</th>
                          <th className="py-3 px-4 w-28 text-center">Estado</th>
                          <th className="py-3 px-4 max-w-xs">Observaciones</th>
                          <th className="py-3 px-4 w-32">Envío</th>
                          <th className="py-3 px-4 w-28">Pago</th>
                          <th className="py-3 px-4 w-28 text-center">Listo</th>
                          <th className="py-3 px-4 w-16 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {selectedDayLogs.map(log => {
                          const bgCompletado = log.completado ? 'bg-emerald-100/80 text-emerald-900 font-medium' : '';

                          return (
                            <tr key={log.id}>
                              <td className={`py-3 px-4 font-semibold text-center ${bgCompletado} ${bgCompletado ? '' : 'text-gray-900'}`}>
                                {log.id}
                              </td>
                              <td className={`py-3 px-4 text-center ${bgCompletado}`}>
                                {log.order_id ? (
                                  <span className={`inline-block px-2 py-1 font-semibold rounded text-xs ${
                                    log.completado 
                                      ? 'bg-emerald-200/60 text-emerald-800' 
                                      : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    #{log.order_id}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className={`py-3 px-4 ${bgCompletado} ${bgCompletado ? '' : 'font-medium text-gray-900'}`}>
                                <div>
                                  {log.descripcion}
                                  {log.client_name && (
                                    <div className={`text-xs font-normal mt-0.5 ${log.completado ? 'text-emerald-700' : 'text-gray-500'}`}>
                                      Cliente: {log.client_name}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className={`py-3 px-4 whitespace-nowrap ${bgCompletado} ${bgCompletado ? '' : 'font-medium text-gray-900'}`}>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className={log.completado ? "text-emerald-600" : "text-gray-400"} />
                                  {formatTimeStr(log.hora_entrega)}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-center ${bgCompletado}`}>
                                {log.responsable === 'maq' ? (
                                  <div className="flex items-center justify-center">
                                    <Check className="h-5 w-5 text-emerald-600 font-bold" />
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className={`py-3 px-4 text-center ${bgCompletado}`}>
                                {log.responsable === 'most' ? (
                                  <div className="flex items-center justify-center">
                                    <Check className="h-5 w-5 text-emerald-600 font-bold" />
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className={`py-3 px-4 text-center ${bgCompletado}`}>
                                {log.status === 'Pendiente' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap bg-gray-100 text-gray-800 border border-gray-200">
                                    Pendiente
                                  </span>
                                )}
                                {log.status === 'En Proceso' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap bg-blue-100 text-blue-800 border border-blue-200">
                                    En Proceso
                                  </span>
                                )}
                                {log.status === 'Realizado' && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold inline-block text-center whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Realizado
                                  </span>
                                )}
                              </td>
                              <td className={`py-3 px-4 text-xs max-w-xs truncate ${bgCompletado} ${bgCompletado ? '' : 'text-gray-500'}`} title={log.observaciones || ''}>
                                {log.observaciones || <span className="text-gray-300">-</span>}
                              </td>
                              <td className={`py-3 px-4 ${bgCompletado} ${bgCompletado ? '' : 'text-gray-600'}`}>
                                {log.envio}
                              </td>
                              <td className={`py-3 px-4 ${bgCompletado} ${bgCompletado ? '' : 'font-medium text-gray-900'}`}>
                                {formatCurrency(log.pago)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center">
                                  <Checkbox
                                    checked={log.completado}
                                    onCheckedChange={(checked) => 
                                      handleCheckboxChange(log.id, !!checked)
                                    }
                                    className="h-5 w-5 border-gray-300 rounded"
                                  />
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => onEditClick(log)}
                                    title="Editar Impresión"
                                  >
                                    <Edit3 size={14} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                <Button onClick={() => setSelectedDay(null)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PrintLogsHistoryTable.displayName = 'PrintLogsHistoryTable';

export default PrintLogsHistoryTable;
