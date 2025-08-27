import React, { useState, useEffect } from 'react';
import { type CreateOrderForm, createOrderSchema, type Order } from "../types";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrdersApiService } from '../OrdersApiService';
import { Button, Input, Label } from '@/components/ui';
import { Calendar, ReceiptText, X, DollarSign, Loader, CalendarDays } from 'lucide-react';

interface Client {
  id: number;
  name: string;
  phone: string;
  address?: string;
  description?: string;
}


interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  currentUserId: number; // ID del usuario actual logueado
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  currentUserId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      user_id: currentUserId,
      date: new Date().toISOString().split('T')[0], // Fecha actual por defecto
      status: 'pending',
      total: 0
    }
  });

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      // Usar la API correcta para obtener clientes
      const response = await window.api.getAllClients();
      setClients(response);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar los clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const onSubmit = async (data: CreateOrderForm) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Formatear las fechas y datos
      const orderData = {
        ...data,
        date: data.date, // Ya viene en formato correcto del input date
        estimated_delivery_date: data.estimated_delivery_date || undefined,
        total: data.total || 0
      };

      const newOrder = await OrdersApiService.create(orderData);
      onOrderCreated(newOrder);
      reset();
      onClose();
    } catch (err) {
      console.error('Error creating order', err);
      setError('Error al crear la orden. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if(!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nueva Orden</h2>
              <p className="text-sm text-gray-500">Agregar una nueva orden al sistema</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Cliente */}
            <div>
              <Label htmlFor="client_id" className="text-sm font-medium text-gray-700">
                Cliente *
              </Label>
              <div className="mt-1">
                {loadingClients ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <Loader className="animate-spin" size={16} />
                    <span className="text-sm text-gray-500">Cargando clientes...</span>
                  </div>
                ) : (
                  <select
                    {...register('client_id', { valueAsNumber: true })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>
              )}
            </div>

            {/* Fecha de la orden */}
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Fecha de la orden *
              </Label>
              <div className="mt-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="date"
                  type="date"
                  className="pl-10"
                  {...register('date')}
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Fecha estimada de entrega */}
            <div>
              <Label htmlFor="estimated_delivery_date" className="text-sm font-medium text-gray-700">
                Fecha estimada de entrega
              </Label>
              <div className="mt-1 relative">
                <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="estimated_delivery_date"
                  type="date"
                  className="pl-10"
                  {...register('estimated_delivery_date')}
                />
              </div>
              {errors.estimated_delivery_date && (
                <p className="mt-1 text-sm text-red-600">{errors.estimated_delivery_date.message}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Estado
              </Label>
              <div className="mt-1">
                <select
                  {...register('status')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="pending"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {/* Total */}
            <div>
              <Label htmlFor="total" className="text-sm font-medium text-gray-700">
                Total
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10"
                  {...register('total', { valueAsNumber: true })}
                />
              </div>
              {errors.total && (
                <p className="mt-1 text-sm text-red-600">{errors.total.message}</p>
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
              {isSubmitting ? 'Creando...' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;