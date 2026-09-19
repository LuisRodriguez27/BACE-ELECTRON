import { z } from 'zod';

export type CreditStatus = 'open' | 'closed';
export type CreditSourceType = 'manual' | 'order' | 'simple_order';
export type CreditPaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro';

export interface CreditItem {
  id: number;
  credit_id: number;
  order_id: number | null;
  simple_order_id: number | null;
  source_type: CreditSourceType;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_by: number;
  edited_by: number | null;
  active: boolean;
  source_client_name: string | null;
  source_client_phone: string | null;
  source_total: number | null;
  created_by_username: string | null;
  edited_by_username: string | null;
}

export interface CreditPayment {
  id: number;
  credit_id: number;
  cash_session_id: number | null;
  created_by: number | null;
  amount: number;
  date: string;
  descripcion: CreditPaymentMethod | string | null;
  info: string | null;
  client_name: string | null;
  phone: string | null;
  created_by_username?: string | null;
}

export interface Credit {
  id: number;
  client_id: number;
  opened_at: string;
  closing_date: string | null;
  status: CreditStatus;
  notes: string | null;
  created_by: number;
  active: boolean;
  client_name: string | null;
  client_phone: string | null;
  client_color: string | null;
  created_by_username: string | null;
  items: CreditItem[];
  payments: CreditPayment[];
  total_charges: number;
  total_paid: number;
  balance: number;
}

export interface CreditSourceSearchResult {
  source_type: Exclude<CreditSourceType, 'manual'>;
  id: number;
  date: string;
  product: string;
  client_name: string | null;
  client_phone: string | null;
  total: number;
  paid: number;
  credited: number;
  available: number;
}

/** A source initiated from an order screen. Normal orders retain their canonical client. */
export interface CreditAssignmentSource extends CreditSourceSearchResult {
  client_id?: number | null;
}

export interface CreditFilters {
  searchTerm?: string;
  status?: CreditStatus | 'all';
}

export interface CreditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedCredits {
  data: Credit[];
  pagination: CreditPagination;
}

export const creditItemFormSchema = z.object({
  source_type: z.enum(['manual', 'order', 'simple_order']),
  source_id: z.number().int().positive().optional(),
  date: z.string().min(1, 'La fecha del trabajo es obligatoria'),
  product: z.string().trim().min(1, 'El producto o concepto es obligatorio'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_price: z.number().positive('El precio debe ser mayor a 0'),
  total: z.number().positive('El total debe ser mayor a 0'),
}).superRefine((data, context) => {
  if (data.source_type !== 'manual' && !data.source_id) {
    context.addIssue({ code: 'custom', path: ['source_id'], message: 'Selecciona una orden de origen' });
  }
  const calculated = Math.round(data.quantity * data.unit_price * 100) / 100;
  if (Math.abs(calculated - data.total) > 0.01) {
    context.addIssue({ code: 'custom', path: ['total'], message: `El total debe ser ${calculated.toFixed(2)}` });
  }
});

export type CreditItemForm = z.infer<typeof creditItemFormSchema>;

export const createCreditSchema = z.object({
  client_id: z.number().int().positive('Selecciona un cliente'),
  notes: z.string().optional(),
  item: creditItemFormSchema,
});

export type CreateCreditForm = z.infer<typeof createCreditSchema>;

export interface CreateCreditPayload {
  client_id: number;
  created_by: number;
  notes?: string | null;
  initial_item: CreditItemPayload;
}

export interface CreditItemPayload {
  credit_id?: number;
  order_id?: number | null;
  simple_order_id?: number | null;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_by: number;
}

export interface UpdateCreditItemPayload {
  date?: string;
  product?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  edited_by: number;
}

export const creditPaymentSchema = z.object({
  amount: z.number().positive('El abono debe ser mayor a 0'),
  date: z.string().min(1, 'La fecha del abono es obligatoria'),
  payment_method: z.enum(['Efectivo', 'Transferencia', 'Tarjeta', 'Otro']),
  info: z.string().optional(),
});

export type CreditPaymentForm = z.infer<typeof creditPaymentSchema>;

export interface AddCreditPaymentPayload extends CreditPaymentForm {
  credit_id: number;
  created_by: number;
}

export interface CreditStatementMovement {
  type: 'charge' | 'payment';
  date: string;
  id: number;
  description: string;
  charge: number;
  payment: number;
  payment_method: string | null;
}

export interface CreditStatement {
  credit: {
    id: number;
    client_id: number;
    client_name: string | null;
    client_phone: string | null;
    status: CreditStatus;
  };
  period: { from: string | null; to: string };
  previous_balance: number;
  total_charges: number;
  total_payments: number;
  closing_balance: number;
  movements: CreditStatementMovement[];
}
