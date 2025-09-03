import { z } from 'zod';

export const createProductTemplateSchema = z.object({
  product_id: z.number().int().min(1, 'El ID del producto es obligatorio'),
  final_price: z.number().min(0, 'El precio final debe ser un número positivo'),
  width: z.number().min(0, 'El ancho debe ser un número positivo').optional(),
  height: z.number().min(0, 'El alto debe ser un número positivo').optional(),
  colors: z.string().optional(),
  position: z.string().optional(),
  texts: z.string().optional(),
  description: z.string().optional(),
  created_by: z.number().int().optional()
});

export const editProductTemplateSchema = createProductTemplateSchema.partial();

export type CreateProductTemplateForm = z.infer<typeof createProductTemplateSchema>;
export type EditProductTemplateForm = z.infer<typeof editProductTemplateSchema>;

export interface ProductTemplate {
  id: number;
  product_id: number;
  final_price: number;
  width?: number;
  height?: number;
  colors?: string;
  position?: string;
  texts?: string;
  description?: string;
  created_by?: number;
  active: number;

  product_name?: string;
  serial_number?: string;

  created_by_username?: string;
}