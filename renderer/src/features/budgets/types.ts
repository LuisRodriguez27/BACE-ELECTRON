// import { z } from 'zod';
// import { budgetItemSchema, type BudgetFormItem } from '@/features/budgets/types';

// // Item de presupuesto - misma estructura que orden
// export const budgetItemSchema = budgetItemSchema;

// // Crear presupuesto - solo campos básicos
// export const createBudgetSchema = z.object({
//   client_name: z.string().min(1, 'El nombre del cliente es obligatorio'),
//   client_phone: z.string().min(1, 'El teléfono del cliente es obligatorio'),
//   date: z.string().min(1, 'La fecha es obligatoria'), 
//   notes: z.string().optional(),
//   items: z.array(budgetItemSchema).min(1, 'El presupuesto debe tener al menos un producto o plantilla')
// });

// export type CreateBudgetForm = z.infer<typeof createBudgetSchema>;
// export type BudgetItem = z.infer<typeof budgetItemSchema>;

// // Tipos para el formulario del frontend (reutilizamos de budgets)
// export type BudgetFormItem = BudgetFormItem;

// // Interface para el presupuesto (solo para manejo en memoria)
// export interface Budget {
//   client_name: string;
//   client_phone: string;
//   date: string; // ISO date string
//   total: number;
//   notes?: string;
//   items: BudgetFormItem[];
// }

// // Funciones de utilidad
// export const createBudgetItemFromFormItem = (formItem: BudgetFormItem): BudgetItem => {
//   if (formItem.type === 'product') {
//     return {
//       product_id: formItem.id,
//       template_id: null,
//       quantity: formItem.quantity,
//       unit_price: formItem.unit_price
//     };
//   } else {
//     return {
//       product_id: null,
//       template_id: formItem.id,
//       quantity: formItem.quantity,
//       unit_price: formItem.unit_price
//     };
//   }
// };

// export const calculateBudgetTotal = (items: BudgetFormItem[]): number => {
//   return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
// };






import { z } from 'zod';

// Item de orden - puede ser producto o plantilla
export const budgetItemSchema = z.object({
  product_id: z.number().int().min(1).nullable().optional(),
  template_id: z.number().int().min(1).nullable().optional(),
  quantity: z.number().min(0.0001, 'La cantidad debe ser al menos 0.0001'),
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
export const createBudgetSchema = z.object({
  client_id: z.number().int().min(1, 'El ID del cliente es obligatorio'),
  user_id: z.number().int().min(1, 'El ID del usuario es obligatorio'),
  date: z.string().min(1, 'La fecha es obligatoria'), 
  items: z.array(budgetItemSchema).min(1, 'La orden debe tener al menos un producto o plantilla')
});

// Editar presupuesto
export const editBudgetSchema = z.object({
  client_id: z.number().int().min(1).optional(),
  user_id: z.number().int().min(1).optional(),
  edited_by: z.number().int().min(1).optional(),
  date: z.string().optional(),
  items: z.array(budgetItemSchema).optional()
});

export type CreateBudgetForm = z.infer<typeof createBudgetSchema>;
export type EditBudgetForm = z.infer<typeof editBudgetSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;

// Interfaces de entidades
export interface Budget {
  id: number;
  client_id: number;
  user_id: number;
  edited_by?: number;
  date: string; // ISO date string
  total: number;
  converted_to_order?: boolean;
  active?: number;

  // Para joins
  client?: {
    id: number;
    name: string;
    phone: string;
    color?: string | null;
  };
  user?: {
    id: number;
    username: string;
  };
  editedByUser?: {
    id: number;
    username: string;
  };
  budgetProducts?: BudgetProduct[];
  payments?: {
    id: number;
    amount: number;
    date?: string;
  }[];
}

export interface BudgetProduct {
  id: number;
  budget_id: number;
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
}

// Tipos para el formulario del frontend
export interface BudgetFormItem {
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
export const createBudgetItemFromFormItem = (formItem: BudgetFormItem): BudgetItem => {
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

export const getBudgetItemDisplayName = (budgetProduct: BudgetProduct): string => {
  if (budgetProduct.product_id) {
    return budgetProduct.product_name || `Producto #${budgetProduct.product_id}`;
  } else if (budgetProduct.template_id) {
    const baseName = budgetProduct.product_name || 'Producto';
    return `${baseName} (Plantilla)`;
  }
  return 'Item desconocido';
};

export const getBudgetItemDescription = (budgetProduct: BudgetProduct): string => {
  if (budgetProduct.product_id) {
    // Para productos directos, usar la descripción del producto
    return budgetProduct.product_description || '';
  } else if (budgetProduct.template_id) {
    // Para plantillas, usar la descripción de la plantilla
    return budgetProduct.template_description || '';
  }
  return '';
};

export const getBudgetItemType = (budgetProduct: BudgetProduct): 'product' | 'template' => {
  return budgetProduct.product_id ? 'product' : 'template';
};

export const calculateBudgetTotal = (items: BudgetFormItem[]): number => {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
};