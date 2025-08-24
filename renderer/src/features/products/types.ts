import { z } from 'zod';

export const createProductSchema = z.object({
	name: z.string().min(1, 'El nombre del producto es obligatorio'),
	serial_number: z.string().optional(),
	price: z.number().min(0, 'El precio debe ser un número mayor a 0'),
	description: z.string().optional()
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