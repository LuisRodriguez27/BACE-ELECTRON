import { z } from 'zod';

export const createOrderSchema = z.object({
	client_id: z.number().int().min(1, 'El ID del cliente es obligatorio'),
	user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
	date: z.string(),
	estimated_delivery_date: z.string().optional(),
	status: z.string().optional(),
	total: z.number().min(0, 'El total debe ser un número positivo').optional()
});

export const editOrderSchema = createOrderSchema.partial();

export type CreateOrderForm = z.infer<typeof createOrderSchema>;
export type EditOrderForm = z.infer<typeof editOrderSchema>;

export interface Order {
	id: number;
	client_id: number;
	user_id: number;
	editated_by?: number;
	date: string; // ISO date string
	estimated_delivery_date?: string; // ISO date string
	status: string;
	total: number;
}