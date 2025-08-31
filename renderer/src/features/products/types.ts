import { z } from 'zod';

export const createProductSchema = z.object({
	name: z.string().min(1, 'El nombre del producto es obligatorio'),
	serial_number: z.string().optional().or(z.literal('')),
	price: z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) return undefined;
			const num = Number(val);
			return isNaN(num) ? undefined : num;
		},
		z.number({ error: 'El precio es obligatorio' }).min(0, 'El precio debe ser mayor o igual a 0')
	),
	description: z.string().optional().or(z.literal('')),
	width: z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) return undefined;
			const num = Number(val);
			return isNaN(num) ? undefined : num;
		},
		z.number().min(0, 'El ancho debe ser mayor o igual a 0').optional()
	),
	height: z.preprocess(
		(val) => {
			if (val === '' || val === null || val === undefined) return undefined;
			const num = Number(val);
			return isNaN(num) ? undefined : num;
		},
		z.number().min(0, 'El alto debe ser mayor o igual a 0').optional()
	),
	colors: z.union([z.string(), z.array(z.string())]).optional(),
	position: z.string().optional().or(z.literal(''))
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