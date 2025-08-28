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
  ['pendiente', 'en proceso', 'completado', 'cancelado'],
  {
    error: 'El estado debe ser: pendiente, en proceso, completado o cancelado'
  }
);

export const createOrderSchema = z.object({
	client_id: z.number().int().min(1, 'El ID del cliente es obligatorio'),
	user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
	date: z.string().min(1, 'La fecha es obligatoria'),
	estimated_delivery_date: z.string().optional(),
	status: orderStatusSchema.default('pendiente'),
	total: z.number().min(0, 'El total debe ser un número positivo'),
	products: z.array(z.object({
		products_id: z.number().int().min(1, 'El ID del producto es obligatorio'),
		quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
		price: z.number().min(0, 'El precio debe ser un número positivo'),
		height: z.number().optional(),
		width: z.number().optional(),
		position: z.string().optional(),
		colors: z.string().optional(),
		description: z.string().optional()
	})).optional()
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
	status: OrderStatusType;
	total: number;
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

// Order Products (tabla de relación)
export const createOrderProductSchema = z.object({
	order_id: z.number().int().min(1, 'El ID de la orden es obligatorio'),
	products_id: z.number().int().min(1, 'El ID del producto es obligatorio'),
	quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
	price: z.number().min(0, 'El precio debe ser un número positivo'),
	height: z.number().optional(),
	width: z.number().optional(),
	position: z.string().optional(),
	colors: z.string().optional(),
	description: z.string().optional()
});

export const editOrderProductSchema = createOrderProductSchema.partial();

export type CreateOrderProductForm = z.infer<typeof createOrderProductSchema>;
export type EditOrderProductForm = z.infer<typeof editOrderProductSchema>;

export interface OrderProduct {
	id: number;
	order_id: number;
	products_id: number;
	quantity: number;
	price: number;
	height?: number;
	width?: number;
	position?: string;
	colors?: string;
	description?: string;
	// Para joins
	product?: {
		id: number;
		name: string;
		serial_number?: string;
	};
	order?: {
		id: number;
		status: OrderStatusType;
		date: string;
	};
}