import { z } from 'zod';

export const createProductTemplateSchema = z.object({
  product_id: z.number().int().min(1, 'El ID del producto es obligatorio'),
  final_price: z.number().min(0, 'El precio final debe ser un número positivo').optional().or(z.nan().transform(() => undefined)),
  promo_price: z.number().min(0).optional().nullable(),
  discount_price: z.number().min(0).optional().nullable(),
  width: z.number().min(0, 'El ancho debe ser un número positivo').nullable().optional().or(z.nan().transform(() => undefined)),
  height: z.number().min(0, 'El alto debe ser un número positivo').nullable().optional().or(z.nan().transform(() => undefined)),
  colors: z.string().optional(),
  position: z.string().optional(),
  texts: z.string().optional(),
  description: z.string().optional(),
  created_by: z.number().int().optional()
});

export const editProductTemplateSchema = z.object({
  product_id: z.number().int().min(1, 'El ID del producto es obligatorio').optional(),
  final_price: z.number().min(0, 'El precio final debe ser un número positivo').optional().or(z.nan().transform(() => undefined)),
  promo_price: z.number().min(0).optional().nullable(),
  discount_price: z.number().min(0).optional().nullable(),
  width: z.number().min(0, 'El ancho debe ser un número positivo').nullable().optional().or(z.nan().transform(() => undefined)),
  height: z.number().min(0, 'El alto debe ser un número positivo').nullable().optional().or(z.nan().transform(() => undefined)),
  colors: z.string().optional(),
  position: z.string().optional(),
  texts: z.string().optional(),
  description: z.string().optional(),
  created_by: z.number().int().optional()
});

export type CreateProductTemplateForm = z.infer<typeof createProductTemplateSchema>;
export type EditProductTemplateForm = z.infer<typeof editProductTemplateSchema>;

export interface ProductTemplate {
  id: number;
  product_id: number;
  final_price: number;
  promo_price?: number | null;
  discount_price?: number | null;
  width?: number;
  height?: number;
  colors?: string;
  position?: string;
  texts?: string;
  description?: string;
  created_by?: number;
  active: boolean;

  product_name?: string;
  serial_number?: string;

  created_by_username?: string;
}