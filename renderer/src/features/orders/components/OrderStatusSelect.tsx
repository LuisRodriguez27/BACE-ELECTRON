import { Loader2 } from 'lucide-react';
import type { OrderStatusType } from '../types';

const statusOptions: Array<{ value: OrderStatusType; label: string }> = [
  { value: 'Revision', label: 'Revisión' },
  { value: 'Diseño', label: 'Diseño' },
  { value: 'Produccion', label: 'Producción' },
  { value: 'Entrega', label: 'Entrega' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

interface OrderStatusSelectProps {
  status: OrderStatusType;
  disabled?: boolean;
  isUpdating?: boolean;
  onChange: (status: OrderStatusType) => void;
}

/** Compact control intended for order cards, not for editing the rest of an order. */
const OrderStatusSelect: React.FC<OrderStatusSelectProps> = ({
  status,
  disabled = false,
  isUpdating = false,
  onChange,
}) => (
  <label className="relative inline-flex min-w-36 items-center">
    <span className="sr-only">Cambiar estado de la orden</span>
    <select
      value={status}
      disabled={disabled || isUpdating}
      onChange={(event) => onChange(event.target.value as OrderStatusType)}
      className="h-8 w-full appearance-none rounded-md border border-gray-300 bg-white py-1 pl-2 pr-7 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label="Cambiar estado de la orden"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    {isUpdating ? (
      <Loader2 className="pointer-events-none absolute right-2 h-3.5 w-3.5 animate-spin text-blue-600" />
    ) : (
      <span className="pointer-events-none absolute right-2 text-xs text-gray-500">⌄</span>
    )}
  </label>
);

export default OrderStatusSelect;
