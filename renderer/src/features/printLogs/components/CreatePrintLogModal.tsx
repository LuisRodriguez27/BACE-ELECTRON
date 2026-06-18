import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/utils/errorHandling';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Clock, DollarSign, FileText, Loader, Printer, Send, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PrintLogsApiService } from '../PrintLogsApiService';
import { createPrintLogSchema, type CreatePrintLogForm, type PrintLog } from '../types';
import { toUTCISO, parseDeliveryDateTimeMX, getDefaultDeliveryDateTimeMX } from '@/utils/dateUtils';

interface CreatePrintLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogCreated: (log: PrintLog) => void;
  onLogUpdated?: (log: PrintLog) => void;
  logToEdit?: PrintLog | null;
}

interface PendingOrder {
  id: number;
  client_name?: string;
  total?: number;
}

const CreatePrintLogModal: React.FC<CreatePrintLogModalProps> = ({
  isOpen,
  onClose,
  onLogCreated,
  onLogUpdated,
  logToEdit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Local states for compound date/time inputs
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('12:00');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CreatePrintLogForm>({
    resolver: zodResolver(createPrintLogSchema),
    defaultValues: {
      order_id: null,
      descripcion: '',
      hora_entrega: '',
      responsable: 'most',
      observaciones: '',
      envio: '',
      pago: null,
      status: 'Pendiente'
    }
  });

  const updateCompoundDateTime = (dateStr: string, timeStr: string) => {
    if (dateStr && timeStr) {
      setValue('hora_entrega', toUTCISO(`${dateStr}T${timeStr}:00`));
    } else {
      setValue('hora_entrega', '');
    }
  };

  // Fetch pending orders for logbook link
  useEffect(() => {
    if (isOpen) {
      const fetchOrders = async () => {
        try {
          setIsLoadingOrders(true);
          const orders = await window.api.getPendingOrdersForLogbook();
          // Map to match our format and sort descending by id (last to first)
          const formattedOrders = orders.map((o: any) => ({
            id: o.id,
            client_name: o.client_name,
            total: o.total
          })).sort((a: any, b: any) => b.id - a.id);
          setPendingOrders(formattedOrders);
        } catch (err) {
          console.error('Error fetching pending orders for logbook:', err);
        } finally {
          setIsLoadingOrders(false);
        }
      };
      fetchOrders();

      if (logToEdit) {
        // Cargar datos en modo edición
        setValue('order_id', logToEdit.order_id);
        setValue('descripcion', logToEdit.descripcion);
        setValue('hora_entrega', toUTCISO(logToEdit.hora_entrega));
        setValue('responsable', logToEdit.responsable);
        setValue('observaciones', logToEdit.observaciones || '');
        setValue('envio', logToEdit.envio);
        setValue('pago', logToEdit.pago);
        setValue('status', logToEdit.status);

        // Desglosar la hora de entrega
        const parsed = parseDeliveryDateTimeMX(logToEdit.hora_entrega);
        setDeliveryDate(parsed.date);
        setDeliveryTime(parsed.time24);
      } else {
        // Inicializar en modo creación
        setValue('order_id', null);
        setValue('descripcion', '');
        setValue('responsable', 'most');
        setValue('observaciones', '');
        setValue('envio', '');
        setValue('pago', null);
        setValue('status', 'Pendiente');

        // Set default delivery time to current time + 1 hour in America/Mexico_City
        const parsed = getDefaultDeliveryDateTimeMX();
        setDeliveryDate(parsed.date);
        setDeliveryTime(parsed.time24);

        setValue('hora_entrega', toUTCISO(`${parsed.date}T${parsed.time24}:00`));
      }
    }
  }, [isOpen, setValue, logToEdit]);

  const selectedOrderId = watch('order_id');

  // If order is selected, pre-fill description or details if desired, 
  // or let user type them.
  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      const orderId = parseInt(val, 10);
      setValue('order_id', orderId);
      const selectedOrder = pendingOrders.find(o => o.id === orderId);
      if (selectedOrder) {
        setValue('descripcion', `Impresión para Orden #${orderId} - Cliente: ${selectedOrder.client_name || 'Sin nombre'}`);
      }
    } else {
      setValue('order_id', null);
      setValue('descripcion', '');
    }
  };

  const onSubmit = async (data: CreatePrintLogForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Format date to ISO using dateUtils
      const formattedData = {
        ...data,
        hora_entrega: toUTCISO(data.hora_entrega),
        pago: data.pago !== undefined && data.pago !== null && String(data.pago).trim() !== '' ? Number(data.pago) : null
      };

      if (logToEdit) {
        // Actualizar registro existente
        const updatedLog = await PrintLogsApiService.update(logToEdit.id, formattedData);
        if (onLogUpdated) {
          onLogUpdated(updatedLog);
        }
      } else {
        // Crear nuevo registro
        const newLog = await PrintLogsApiService.create(formattedData);
        onLogCreated(newLog);
      }
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error saving print log:', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Printer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {logToEdit ? 'Editar Impresión' : 'Nueva Impresión'}
              </h2>
              <p className="text-sm text-gray-500">
                {logToEdit ? `Modificar el registro #${logToEdit.id}` : 'Registrar un nuevo registro de impresión'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Order ID Selection */}
            <div>
              <Label htmlFor="order_select" className="text-sm font-medium text-gray-700">
                Vincular a Orden de Trabajo (Opcional)
              </Label>
              <div className="mt-1">
                <select
                  id="order_select"
                  value={selectedOrderId || ''}
                  onChange={handleOrderChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Ingresar sin orden vinculada --</option>
                  {isLoadingOrders ? (
                    <option disabled>Cargando órdenes...</option>
                  ) : (
                    pendingOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        Orden #{order.id} - {order.client_name || 'Sin Cliente'} (${order.total})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700">
                Descripción de Impresión *
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="descripcion"
                  type="text"
                  placeholder="Ej: Lona front 2x3m con ojillos"
                  className="pl-10"
                  {...register('descripcion')}
                />
              </div>
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Fecha de Entrega */}
              <div>
                <Label htmlFor="fecha_entrega" className="text-sm font-medium text-gray-700">
                  Fecha de Entrega *
                </Label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="fecha_entrega"
                    type="date"
                    className="pl-10"
                    value={deliveryDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeliveryDate(val);
                      updateCompoundDateTime(val, deliveryTime);
                    }}
                  />
                </div>
                {errors.hora_entrega && (
                  <p className="mt-1 text-sm text-red-600">{errors.hora_entrega.message}</p>
                )}
              </div>

              {/* Hora de Entrega */}
              <div>
                <Label htmlFor="hora_input" className="text-sm font-medium text-gray-700">
                  Hora de Entrega *
                </Label>
                <div className="mt-1 relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="hora_input"
                    type="time"
                    className="pl-10 cursor-pointer"
                    value={deliveryTime}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeliveryTime(val);
                      updateCompoundDateTime(deliveryDate, val);
                    }}
                  />
                </div>
                <input type="hidden" {...register('hora_entrega')} />
              </div>

              {/* Responsable */}
              <div>
                <Label htmlFor="responsable" className="text-sm font-medium text-gray-700">
                  Tipo de Cliente *
                </Label>
                <div className="mt-1">
                  <select
                    id="responsable"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    {...register('responsable')}
                  >
                    <option value="most">Mostrador (most)</option>
                    <option value="maq">Maquila (maq)</option>
                  </select>
                </div>
                {errors.responsable && (
                  <p className="mt-1 text-sm text-red-600">{errors.responsable.message}</p>
                )}
              </div>

              {/* Estado / Status */}
              <div>
                <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                  Estado *
                </Label>
                <div className="mt-1">
                  <select
                    id="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    {...register('status')}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Realizado">Realizado</option>
                  </select>
                </div>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Delivery Type */}
              <div>
                <Label htmlFor="envio" className="text-sm font-medium text-gray-700">
                  Envío / Entrega *
                </Label>
                <div className="mt-1 relative">
                  <Send className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="envio"
                    type="text"
                    placeholder="Ej: Sucursal, Domicilio, Paquetería"
                    className="pl-10"
                    {...register('envio')}
                  />
                </div>
                {errors.envio && (
                  <p className="mt-1 text-sm text-red-600">{errors.envio.message}</p>
                )}
              </div>

              {/* Payment */}
              <div>
                <Label htmlFor="pago" className="text-sm font-medium text-gray-700">
                  Pago (Opcional)
                </Label>
                <div className="mt-1 relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    id="pago"
                    type="number"
                    step="0.01"
                    placeholder="Monto pagado"
                    className="pl-10"
                    onChange={(e) => {
                      const v = e.target.value;
                      setValue('pago', v === '' ? null : parseFloat(v));
                    }}
                  />
                </div>
                {errors.pago && (
                  <p className="mt-1 text-sm text-red-600">{errors.pago.message}</p>
                )}
              </div>
            </div>

            {/* Observations */}
            <div>
              <Label htmlFor="observaciones" className="text-sm font-medium text-gray-700">
                Observaciones
              </Label>
              <div className="mt-1">
                <textarea
                  id="observaciones"
                  placeholder="Detalles sobre materiales, acabados, etc. (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  {...register('observaciones')}
                />
              </div>
              {errors.observaciones && (
                <p className="mt-1 text-sm text-red-600">{errors.observaciones.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="animate-spin" size={16} />}
              {isSubmitting ? 'Guardando...' : (logToEdit ? 'Guardar Cambios' : 'Registrar')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePrintLogModal;
