import { z } from 'zod';
import type { ProductTemplate } from '../productTemplates/types';

export const createProductSchema = z.object({
	name: z.string().min(1, 'El nombre del producto es obligatorio'),
	serial_number: z.string().optional().or(z.literal('')),
	price: z.number({ error: 'El precio debe ser un número' }).min(0, 'El precio debe ser mayor o igual a 0'),
	promo_price: z.number().min(0).optional().nullable(),
	discount_price: z.number().min(0).optional().nullable(),
	description: z.string().optional().or(z.literal('')),
	images: z.array(z.string()).optional().nullable(),
});

export const editProductSchema = createProductSchema.partial();

export type CreateProductForm = z.infer<typeof createProductSchema>;
export type EditProductForm = z.infer<typeof editProductSchema>;

export interface Product {
	id: number;
	name: string;
	serial_number?: string;
	price: number;
	promo_price?: number | null;
	discount_price?: number | null;
	description?: string;
	images?: string[] | null;
	active: boolean; 

	templates?: ProductTemplate[];
}

export interface SimilarNameProduct {
	id: number;
	name: string;
	serial_number?: string | null;
}

export interface SimilarNameResult {
	word: string;
	count: number;
	products: SimilarNameProduct[];
}