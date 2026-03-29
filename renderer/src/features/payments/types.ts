import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.number().int().min(1).optional(),
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  date: z.string().optional(),
  descripcion: z.string().optional(),
  info: z.string().optional()
});

export const editPaymentSchema = z.object({
  amount: z.number().min(1, 'El monto debe ser mayor a 0'),
  descripcion: z.string().optional()
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
  // Para joins con orders
  order?: {
    id: number;
    client_id: number;
    status: string;
    total: number;
  } | null;
}
