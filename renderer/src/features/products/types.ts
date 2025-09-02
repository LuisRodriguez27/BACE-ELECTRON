import { z } from 'zod';

export const createProductSchema = z.object({
	name: z.string().min(1, 'El nombre del producto es obligatorio'),
	serial_number: z.string().optional().or(z.literal('')),
	price: z.number({ error: 'El precio debe ser un número' }).min(0, 'El precio debe ser mayor o igual a 0'),
	description: z.string().optional().or(z.literal('')),
});

export const editProductSchema = createProductSchema.partial();

export type CreateProductForm = z.infer<typeof createProductSchema>;
export type EditProductForm = z.infer<typeof editProductSchema>;

export interface Product {
	id: number;
	name: string;
	serial_number?: string;
	price: number;
	description?: string;
	active: number; // 1 for active, 0 for inactive
}