import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.number().int().min(1).optional(),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  date: z.string().optional(),
  descripcion: z.string().optional(),
  info: z.string().optional(),
  phone: z.string().optional(),
  clientName: z.string().optional()
});

export const editPaymentSchema = z.object({
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  descripcion: z.string().optional(),
  info: z.string().optional(),
  phone: z.string().optional(),
  clientName: z.string().optional()
});

export type CreatePaymentForm = z.infer<typeof createPaymentSchema>;
export type EditPaymentForm = z.infer<typeof editPaymentSchema>;

export interface Payment {
  id: number;
  order_id?: number | null;
  amount: number;
  date?: string; // ISO date string
  descripcion?: string;
  info?: string | null;
  phone?: string | null;
  client_name?: string | null;
  clientCreated?: boolean;
  is_simple_order?: boolean;
  simple_order_id?: number | null;
  // Para joins con orders
  order?: {
    id: number;
    client_id: number;
    status: string;
    total: number;
    client_name?: string;
    client_phone?: string | null;
    description?: string | null;
    notes?: string | null;
  } | null;
}

export interface PaymentFilters {
  freeOnly?: boolean;
  orderFilter?: number | 'free' | 'simple' | null;
  searchType?: 'payment_id' | 'order_id' | 'amount' | 'method' | 'info';
  searchTerm?: string;
}

export interface PaymentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedPayments {
  data: Payment[];
  pagination: PaymentPagination;
}
