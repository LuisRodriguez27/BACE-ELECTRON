import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.number().int().min(1, 'El ID de la orden es obligatorio'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  date: z.string().optional(),
  descripcion: z.string().optional()
});

export const editPaymentSchema = z.object({
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  descripcion: z.string().optional()
});

export type CreatePaymentForm = z.infer<typeof createPaymentSchema>;
export type EditPaymentForm = z.infer<typeof editPaymentSchema>;

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  date?: string; // ISO date string
  descripcion?: string;
  // Para joins con orders
  order?: {
    id: number;
    client_id: number;
    status: string;
    total: number;
  };
}

export interface PaymentSummary {
  order_id: number;
  total_payments: number;
  pending_amount: number;
  payment_count: number;
}
