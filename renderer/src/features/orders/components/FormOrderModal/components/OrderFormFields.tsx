import React from 'react';
import { Input, Label } from '@/components/ui';
import { Calendar, CalendarDays, DollarSign } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CreateOrderForm } from '../../../types';

interface OrderFormFieldsProps {
  register: UseFormRegister<CreateOrderForm>;
  errors: FieldErrors<CreateOrderForm>;
  total: number;
}

const OrderFormFields: React.FC<OrderFormFieldsProps> = ({ register, errors, total }) => {
  return (
    <>
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
          >
            <option value="Revision">Revisión</option>
            <option value="Diseño">Diseño</option>
            <option value="Produccion">Producción</option>
            <option value="Entrega">Entrega</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Total (solo lectura) */}
      <div>
        <Label htmlFor="total" className="text-sm font-medium text-gray-700">
          Total (calculado automáticamente)
        </Label>
        <div className="mt-1 relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            id="total"
            type="text"
            value={`$${total.toFixed(2)}`}
            className="pl-10 bg-gray-50"
            readOnly
          />
        </div>
      </div>

      {/* Responsable */}
      <div>
        <Label htmlFor="responsable" className="text-sm font-medium text-gray-700">
          Responsable
        </Label>
        <div className="mt-1 relative">
          <select
            {...register('responsable')}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Mostrador">Mostrador</option>
            <option value="Maquila">Maquila</option>
          </select>
        </div>
        {errors.responsable && (
          <p className="mt-1 text-sm text-red-600">{errors.responsable.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="md:col-span-2">
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
          Descripción (Imprimible)
        </Label>
        <textarea
          {...register('description')}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="Descripción de la orden..."
        />
      </div>

      {/* Notas */}
      <div className="md:col-span-2">
        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
          Notas
        </Label>
        <textarea
          {...register('notes')}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="Notas adicionales sobre la orden..."
        />
      </div>
    </>
  );
};

export default OrderFormFields;
