import { z } from 'zod';

// Enum para los estados de orden
export const OrderStatus = {
	PENDIENTE: 'pendiente',
	EN_PROCESO: 'en proceso',
	COMPLETADO: 'completado',
	CANCELADO: 'cancelado'
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

const orderStatusSchema = z.enum(
  ['pendiente', 'en proceso', 'completado', 'cancelado'] as const
);

// Crear orden (el front siempre manda productos)
export const createOrderSchema = z.object({
  client_id: z.number().int().min(1, 'El ID del cliente es obligatorio'),
  user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
  date: z.string().min(1, 'La fecha es obligatoria'), 
  estimated_delivery_date: z.string().optional(), 
  status: orderStatusSchema,
  notes: z.string().optional(),
  products: z.array(
    z.object({
      product_id: z.number().int().min(1, 'El ID del producto es obligatorio'),
      template_id: z.number().int().optional(),
      quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
      unit_price: z.number().min(0, 'El precio debe ser un número positivo'),
      // Extras de personalización (opcionales)
      width: z.number().min(0, 'El ancho debe ser un número positivo').optional(),
      height: z.number().min(0, 'El alto debe ser un número positivo').optional(),
      colors: z.union([z.string(), z.array(z.string())]).optional(),
      position: z.string().optional(),
      description: z.string().optional()
    })
  ).min(1, 'La orden debe tener al menos un producto')
});

// Editar orden (no se pueden editar productos)
export const editOrderSchema = z.object({
  estimated_delivery_date: z.string().optional(),
  status: orderStatusSchema.optional(),
  notes: z.string().optional(),
  edited_by: z.number().int().optional()
});

export type CreateOrderForm = z.infer<typeof createOrderSchema>;
export type EditOrderForm = z.infer<typeof editOrderSchema>;

// Interfaces de entidades
export interface Order {
  id: number;
  client_id: number;
  user_id: number;
  edited_by?: number;
  date: string; // ISO date string
  estimated_delivery_date?: string; // ISO date string
  status: OrderStatusType;
  total: number;
  notes?: string;

  // Para joins
  client?: {
    id: number;
    name: string;
    phone: string;
  };
  user?: {
    id: number;
    username: string;
  };
  editedByUser?: {
    id: number;
    username: string;
  };
  orderProducts?: OrderProduct[];
  payments?: {
    id: number;
    amount: number;
    date?: string;
  }[];
}

export interface OrderProduct {
  id: number;
  order_id: number;
  product_id: number;
  template_id?: number;
  quantity: number;
  unit_price: number;
  total_price: number;

  // Datos añadidos por JOIN con products
  product_name?: string;
  serial_number?: string;
  product_description?: string;

  // Datos añadidos por JOIN con templates
  template_width?: number;
  template_height?: number;
  template_colors?: string;
  template_position?: string;
  template_texts?: string;
  template_description?: string;
  template_created_by_username?: string;
}
