import React from 'react';
import { Input, Label } from '@/components/ui';
import { Calendar, CalendarDays } from 'lucide-react';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CreateOrderForm } from '../../../types';

interface OrderFormFieldsProps {
  register: UseFormRegister<CreateOrderForm>;
  errors: FieldErrors<CreateOrderForm>;
  setValue: UseFormSetValue<CreateOrderForm>;
  watch: UseFormWatch<CreateOrderForm>;
  total: number;
}

const statusOptions = [
  { value: 'Revision', label: 'Revisión', activeClass: 'bg-yellow-50 text-yellow-700 border-yellow-300 font-semibold shadow-sm ring-1 ring-yellow-100' },
  { value: 'Diseño', label: 'Diseño', activeClass: 'bg-purple-50 text-purple-700 border-purple-300 font-semibold shadow-sm ring-1 ring-purple-100' },
  { value: 'Produccion', label: 'Producción', activeClass: 'bg-blue-50 text-blue-700 border-blue-300 font-semibold shadow-sm ring-1 ring-blue-100' },
  { value: 'Entrega', label: 'Entrega', activeClass: 'bg-cyan-50 text-cyan-700 border-cyan-300 font-semibold shadow-sm ring-1 ring-cyan-100' },
  { value: 'Completado', label: 'Completado', activeClass: 'bg-green-50 text-green-700 border-green-300 font-semibold shadow-sm ring-1 ring-green-100' },
  { value: 'Cancelado', label: 'Cancelado', activeClass: 'bg-red-50 text-red-700 border-red-300 font-semibold shadow-sm ring-1 ring-red-100' },
] as const;

const OrderFormFields: React.FC<OrderFormFieldsProps> = ({ register, errors, setValue, watch, total }) => {
  const currentStatus = watch('status');
  const currentResponsable = watch('responsable');

  return (
    <>
      {/* Total (vista premium card) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col justify-center h-full min-h-[72px]">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Total de la Orden
        </Label>
        <div className="flex items-baseline gap-1 mt-1 text-2xl font-bold text-green-600">
          <span className="text-lg font-semibold">$</span>
          <span>{total.toFixed(2)}</span>
          <span className="text-xs text-gray-500 font-normal ml-1">MXN</span>
        </div>
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

      {/* Responsable */}
      <div>
        <Label className="text-sm font-medium text-gray-700 block mb-1">
          Responsable
        </Label>
        <input type="hidden" {...register('responsable')} />
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 h-[38px] items-center mt-1">
          <button
            type="button"
            onClick={() => setValue('responsable', 'Mostrador')}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer select-none text-center ${
              currentResponsable === 'Mostrador'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-900 bg-transparent border-transparent border'
            }`}
          >
            Mostrador
          </button>
          <button
            type="button"
            onClick={() => setValue('responsable', 'Maquila')}
            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer select-none text-center ${
              currentResponsable === 'Maquila'
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-900 bg-transparent border-transparent border'
            }`}
          >
            Maquila
          </button>
        </div>
        {errors.responsable && (
          <p className="mt-1 text-sm text-red-600">{errors.responsable.message}</p>
        )}
      </div>

      {/* Estado (Horizontal Pills) */}
      <div className="md:col-span-3">
        <Label className="text-sm font-medium text-gray-700 block mb-1">
          Estado
        </Label>
        <input type="hidden" {...register('status')} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {statusOptions.map((option) => {
            const isActive = currentStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('status', option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer select-none ${
                  isActive
                    ? option.activeClass
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {errors.status && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="md:col-span-3">
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
          Descripción (Imprimible)
        </Label>
        <textarea
          {...register('description')}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-sm"
          rows={3}
          placeholder="Descripción de la orden..."
        />
      </div>

      {/* Notas */}
      <div className="md:col-span-3">
        <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
          Notas (Internas)
        </Label>
        <textarea
          {...register('notes')}
          className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-sans text-sm"
          rows={3}
          placeholder="Notas adicionales sobre la orden..."
        />
      </div>
    </>
  );
};

export default OrderFormFields;
