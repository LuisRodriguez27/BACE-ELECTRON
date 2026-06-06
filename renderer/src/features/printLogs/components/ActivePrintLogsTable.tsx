import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Check, 
  Loader, 
  Printer, 
  Send, 
  Edit3 
} from 'lucide-react';
import { PrintLogsApiService } from '../PrintLogsApiService';
import { extractErrorMessage } from '@/utils/errorHandling';
import type { GroupedPrintLogs, PrintLog, PrintLogsTableRef } from '../types';
import { formatDateMX, formatDateHeaderMX, isBeforeNow } from '@/utils/dateUtils';
import { generatePrintLogbookHtml } from '../logbook';

interface ActivePrintLogsTableProps {
  onEditClick: (log: PrintLog) => void;
}

const ActivePrintLogsTable = forwardRef<PrintLogsTableRef, ActivePrintLogsTableProps>(
  ({ onEditClick }, ref) => {
    const [activeGroups, setActiveGroups] = useState<GroupedPrintLogs[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const fetchActiveLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const groups = await PrintLogsApiService.getActive();
        setActiveGroups(groups);
      } catch (err) {
        console.error('Error fetching active print logs:', err);
        setError(extractErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchActiveLogs();
    }, []);

    const handleCheckboxChange = async (
      logId: number,
      value: boolean
    ) => {
      try {
        // Optimistic UI update
        setActiveGroups(prev => 
          prev.map(group => ({
            ...group,
            logs: group.logs.map(log => 
              log.id === logId ? { ...log, completado: value } : log
            )
          }))
        );

        await PrintLogsApiService.updateCheckboxes(logId, { completado: value });
        // Refetch active logs so completed historical ones disappear from the list
        fetchActiveLogs();
      } catch (err) {
        console.error('Error updating checkbox:', err);
        // Revert in case of failure
        fetchActiveLogs();
      }
    };

    // Expose functions to parent
    useImperativeHandle(ref, () => ({
      refresh: () => {
        fetchActiveLogs();
      },
      handleLogUpdated: (_updatedLog: PrintLog) => {
        // Refetch active logs to ensure correct filtering and grouping of the updated log
        fetchActiveLogs();
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

    if (isLoading && activeGroups.length === 0) {
      return (
        <div className="flex justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      );
    }

    if (activeGroups.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Printer className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700">No hay registros hoy</h3>
            <p className="text-gray-500 text-sm max-w-sm mt-1">
              No se han registrado impresiones el día de hoy, ni hay entregas pendientes de días anteriores.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            <p className="font-medium">Ha ocurrido un error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {activeGroups.map(group => (
          <Card key={group.date} className="overflow-hidden shadow-sm border border-gray-200 bg-white">
            <CardHeader className="bg-gray-50 py-4 px-6 border-b border-gray-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                {formatDateHeaderMX(group.date)}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  {group.logs.length} {group.logs.length === 1 ? 'impresión' : 'impresiones'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 flex items-center gap-1.5 text-xs bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePrintGroup(group.logs, group.date)}
                  title="Imprimir esta bitácora"
                >
                  <Printer size={12} />
                  Imprimir
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 border-collapse">
                <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200 uppercase">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">ID</th>
                    <th className="py-3 px-4 w-24 text-center">Orden</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 w-32">Entrega</th>
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
                  {group.logs.map(log => {
                    const isLate = isBeforeNow(log.hora_entrega) && !log.completado;
                    const bgCompletado = log.completado ? 'bg-emerald-100/80 text-emerald-900 font-medium' : '';

                    return (
                      <tr 
                        key={log.id} 
                        className={isLate ? 'animate-blink-red' : ''}
                      >
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
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className={isLate ? "text-red-500" : (log.completado ? "text-emerald-600" : "text-gray-400")} />
                            {formatTimeStr(log.hora_entrega)}
                            {isLate && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 py-0.5 rounded">
                                Atrasado
                              </span>
                            )}
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
                          <span className="flex items-center gap-1">
                            <Send size={12} className={log.completado ? "text-emerald-600" : "text-gray-400"} />
                            {log.envio}
                          </span>
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
          </Card>
        ))}
      </div>
    );
  }
);

ActivePrintLogsTable.displayName = 'ActivePrintLogsTable';

export default ActivePrintLogsTable;
