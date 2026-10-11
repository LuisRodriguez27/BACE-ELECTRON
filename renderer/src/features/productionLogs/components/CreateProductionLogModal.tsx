import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/utils/errorHandling';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Clock, FileText, Loader, ClipboardList, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ProductionLogsApiService } from '../ProductionLogsApiService';
import { createProductionLogSchema, type CreateProductionLogForm, type ProductionLog } from '../types';
import { toUTCISO, parseDeliveryDateTimeMX, getDefaultDeliveryDateTimeMX } from '@/utils/dateUtils';
import { useAuthStore } from '@/store/auth';

interface CreateProductionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogCreated: (log: ProductionLog) => void;
  onLogUpdated?: (log: ProductionLog) => void;
  logToEdit?: ProductionLog | null;
}

interface PendingOrder {
  id: number;
  client_name?: string;
  total?: number;
}

const CreateProductionLogModal: React.FC<CreateProductionLogModalProps> = ({
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
  const user = useAuthStore((state) => state.user);

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
  } = useForm<CreateProductionLogForm>({
    resolver: zodResolver(createProductionLogSchema),
    defaultValues: {
      order_id: null,
      created_by: null,
      delivery_at: '',
      cantidad: 1,
      descripcion: '',
      responsable: 'most',
      completado: false
    }
  });

  const updateCompoundDateTime = (dateStr: string, timeStr: string) => {
    if (dateStr && timeStr) {
      setValue('delivery_at', toUTCISO(`${dateStr}T${timeStr}:00`));
    } else {
      setValue('delivery_at', '');
    }
  };

  // Fetch pending orders for logbook link
  useEffect(() => {
    if (isOpen) {
      const fetchOrders = async () => {
        try {
          setIsLoadingOrders(true);
          const orders = await window.api.getPendingOrdersForLogbook();
          const formattedOrders = orders.map((o: any) => ({
            id: o.id,
            client_name: o.client_name,
            total: o.total
          })).sort((a: any, b: any) => b.id - a.id);
          setPendingOrders(formattedOrders);
        } catch (err) {
          console.error('Error fetching pending orders for production logs:', err);
        } finally {
          setIsLoadingOrders(false);
        }
      };
      fetchOrders();

      if (logToEdit) {
        setValue('order_id', logToEdit.order_id);
        setValue('created_by', logToEdit.created_by);
        setValue('delivery_at', toUTCISO(logToEdit.delivery_at));
        setValue('cantidad', logToEdit.cantidad);
        setValue('descripcion', logToEdit.descripcion);
        setValue('responsable', logToEdit.responsable);
        setValue('completado', logToEdit.completado);

        const parsed = parseDeliveryDateTimeMX(logToEdit.delivery_at);
        setDeliveryDate(parsed.date);
        setDeliveryTime(parsed.time24);
      } else {
        setValue('order_id', null);
        setValue('created_by', user?.id || null);
        setValue('cantidad', 1);
        setValue('descripcion', '');
        setValue('responsable', 'most');
        setValue('completado', false);

        const parsed = getDefaultDeliveryDateTimeMX();
        setDeliveryDate(parsed.date);
        setDeliveryTime(parsed.time24);

        setValue('delivery_at', toUTCISO(`${parsed.date}T${parsed.time24}:00`));
      }
    }
  }, [isOpen, setValue, logToEdit, user]);

  const selectedOrderId = watch('order_id');

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      const orderId = parseInt(val, 10);
      setValue('order_id', orderId);
      const selectedOrder = pendingOrders.find(o => o.id === orderId);
      if (selectedOrder) {
        setValue('descripcion', `Producción para Orden #${orderId} - Cliente: ${selectedOrder.client_name || 'Sin nombre'}`);
      }
    } else {
      setValue('order_id', null);
      setValue('descripcion', '');
    }
  };

  const onSubmit = async (data: CreateProductionLogForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const formattedData = {
        ...data,
        created_by: data.created_by || user?.id || null,
        delivery_at: toUTCISO(data.delivery_at),
        cantidad: Number(data.cantidad)
      };

      if (logToEdit) {
        const updatedLog = await ProductionLogsApiService.update(logToEdit.id, formattedData);
        if (onLogUpdated) {
          onLogUpdated(updatedLog);
        }
      } else {
        const newLog = await ProductionLogsApiService.create(formattedData);
        onLogCreated(newLog);
      }
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error saving production log:', err);
      setError(extractErrorMessage(err));
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
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {logToEdit ? 'Editar Registro de Producción' : 'Nuevo Registro de Producción'}
              </h2>
              <p className="text-sm text-gray-500">
                {logToEdit ? `Modificar el registro #${logToEdit.id}` : 'Registrar un nuevo registro de producción'}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                Descripción de Producción *
              </Label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="descripcion"
                  type="text"
                  placeholder="Ej: Impresión y corte de 100 etiquetas"
                  className="pl-10"
                  {...register('descripcion')}
                />
              </div>
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cantidad */}
              <div>
                <Label htmlFor="cantidad" className="text-sm font-medium text-gray-700">
                  Cantidad *
                </Label>
                <div className="mt-1">
                  <Input
                    id="cantidad"
                    type="number"
                    step="0.0001"
                    placeholder="Ej: 1"
                    {...register('cantidad', { valueAsNumber: true })}
                  />
                </div>
                {errors.cantidad && (
                  <p className="mt-1 text-sm text-red-600">{errors.cantidad.message}</p>
                )}
              </div>

              {/* Responsable */}
              <div>
                <Label htmlFor="responsable" className="text-sm font-medium text-gray-700">
                  Tipo de Cliente *
                </Label>
                <div className="mt-1">
                  <select
                    id="responsable"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                {errors.delivery_at && (
                  <p className="mt-1 text-sm text-red-600">{errors.delivery_at.message}</p>
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
                <input type="hidden" {...register('delivery_at')} />
              </div>
            </div>

            {/* Check in de Listo */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id="completado"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                {...register('completado')}
              />
              <Label htmlFor="completado" className="text-sm font-medium text-gray-700 cursor-pointer">
                Marcar como Listo / Completado
              </Label>
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
              className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
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

export default CreateProductionLogModal;
