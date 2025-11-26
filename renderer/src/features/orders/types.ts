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

// Item de orden - puede ser producto o plantilla
export const orderItemSchema = z.object({
  product_id: z.number().int().min(1).nullable().optional(),
  template_id: z.number().int().min(1).nullable().optional(),
  quantity: z.number().min(0.0001, 'La cantidad debe ser al menos 0.1'),
  unit_price: z.number().min(0, 'El precio debe ser un número positivo'),
}).refine((data) => {
  // Debe tener exactamente uno: product_id O template_id
  const hasProduct = data.product_id !== null && data.product_id !== undefined;
  const hasTemplate = data.template_id !== null && data.template_id !== undefined;
  return (hasProduct && !hasTemplate) || (!hasProduct && hasTemplate);
}, {
  message: "Debe especificar un producto O una plantilla, no ambos",
});

// Crear orden - nueva estructura con items
export const createOrderSchema = z.object({
  client_id: z.number().int().min(1, 'El ID del cliente es obligatorio'),
  user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
  date: z.string().min(1, 'La fecha es obligatoria'), 
  estimated_delivery_date: z.string().optional(), 
  status: orderStatusSchema,
  notes: z.string().optional(),
  description: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'La orden debe tener al menos un producto o plantilla')
});

// Editar orden (ahora se pueden editar productos)
export const editOrderSchema = z.object({
  client_id: z.number().int().min(1).optional(),
  date: z.string().optional(),
  estimated_delivery_date: z.string().optional(),
  status: orderStatusSchema.optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  items: z.array(orderItemSchema).optional(),
  edited_by: z.number().int().optional()
});

export type CreateOrderForm = z.infer<typeof createOrderSchema>;
export type EditOrderForm = z.infer<typeof editOrderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;

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
  description?: string;

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
  product_id: number | null;
  template_id?: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;

  // Datos añadidos por JOIN con products
  product_name?: string;
  serial_number?: string;
  product_price?: number;
  product_description?: string;

  // Datos añadidos por JOIN con templates
  template_width?: number;
  template_height?: number;
  template_colors?: string;
  template_position?: string;
  template_texts?: string;
  template_description?: string;
  template_final_price?: number;
  template_created_by_username?: string;
  template_base_product_name?: string;
}

// Tipos para el formulario del frontend
export interface OrderFormItem {
  type: 'product' | 'template';
  id: number; // product_id o template_id
  name: string;
  quantity: number;
  unit_price: number;
  // Datos adicionales según el tipo
  description?: string;
  serial_number?: string; // solo productos
  width?: number; // solo plantillas
  height?: number; // solo plantillas
  colors?: string; // solo plantillas
  position?: string; // solo plantillas
  texts?: string; // solo plantillas
}

// Funciones de utilidad
export const createOrderItemFromFormItem = (formItem: OrderFormItem): OrderItem => {
  if (formItem.type === 'product') {
    return {
      product_id: formItem.id,
      template_id: null,
      quantity: formItem.quantity,
      unit_price: formItem.unit_price
    };
  } else {
    return {
      product_id: null,
      template_id: formItem.id,
      quantity: formItem.quantity,
      unit_price: formItem.unit_price
    };
  }
};

export const getOrderItemDisplayName = (orderProduct: OrderProduct): string => {
  if (orderProduct.product_id) {
    return orderProduct.product_name || `Producto #${orderProduct.product_id}`;
  } else if (orderProduct.template_id) {
    const baseName = orderProduct.template_base_product_name || orderProduct.product_name || 'Producto';
    return baseName;
  }
  return 'Item desconocido';
};

export const getOrderItemDescription = (orderProduct: OrderProduct): string => {
  if (orderProduct.product_id) {
    // Para productos directos, usar la descripción del producto
    return orderProduct.product_description || '';
  } else if (orderProduct.template_id) {
    // Para plantillas, usar la descripción de la plantilla
    return orderProduct.template_description || '';
  }
  return '';
};

export const getOrderItemType = (orderProduct: OrderProduct): 'product' | 'template' => {
  return orderProduct.product_id ? 'product' : 'template';
};

export const calculateOrderTotal = (items: OrderFormItem[]): number => {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
};