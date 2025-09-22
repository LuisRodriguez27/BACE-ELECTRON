import { z } from 'zod';
import { orderItemSchema, type OrderFormItem } from '@/features/orders/types';

// Item de presupuesto - misma estructura que orden
export const budgetItemSchema = orderItemSchema;

// Crear presupuesto - solo campos básicos
export const createBudgetSchema = z.object({
  client_name: z.string().min(1, 'El nombre del cliente es obligatorio'),
  client_phone: z.string().min(1, 'El teléfono del cliente es obligatorio'),
  date: z.string().min(1, 'La fecha es obligatoria'), 
  notes: z.string().optional(),
  items: z.array(budgetItemSchema).min(1, 'El presupuesto debe tener al menos un producto o plantilla')
});

export type CreateBudgetForm = z.infer<typeof createBudgetSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;

// Tipos para el formulario del frontend (reutilizamos de orders)
export type BudgetFormItem = OrderFormItem;

// Interface para el presupuesto (solo para manejo en memoria)
export interface Budget {
  client_name: string;
  client_phone: string;
  date: string; // ISO date string
  total: number;
  notes?: string;
  items: BudgetFormItem[];
}

// Funciones de utilidad
export const createBudgetItemFromFormItem = (formItem: BudgetFormItem): BudgetItem => {
  if (formItem.type === 'product') {
    return {
      product_id: formItem.id,
      template_id: null,
      quantity: formItem.quantity,
      unit_price: formItem.unit_price
    };
  } else {
    return {
      product_id: null,
      template_id: formItem.id,
      quantity: formItem.quantity,
      unit_price: formItem.unit_price
    };
  }
};

export const calculateBudgetTotal = (items: BudgetFormItem[]): number => {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
};
