import { z } from 'zod';

export const createProductSchema = z.object({
	name: z.string().min(1, 'El nombre del producto es obligatorio'),
	serial_number: z.string().optional(),
	price: z.number().min(0, 'El precio debe ser un número mayor a 0'),
	description: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	colors: z.union([z.string(), z.array(z.string())]).optional(),
	position: z.string().optional()
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
	width?: number;
	height?: number;
	colors?: string; // JSON string en la BD
	position?: string;
	active: number; // 1 for active, 0 for inactive
}