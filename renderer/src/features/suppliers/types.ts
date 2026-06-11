import { z } from 'zod';

// Schema for creating a supplier
export const createSupplierSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: z.string().min(10, 'El teléfono debete de tener al menos 10 digitos').or(z.literal('')).nullable().optional(),
  email: z.string().email('Formato de correo electrónico inválido').or(z.literal('')).nullable().optional(),
  description: z.string().nullable().optional(),
  columns: z.array(z.string()).nullable().optional()
});

// Schema for editing a supplier
export const editSupplierSchema = createSupplierSchema.partial();

// Infer types from Zod schemas
export type CreateSupplierForm = z.infer<typeof createSupplierSchema>;
export type EditSupplierForm = z.infer<typeof editSupplierSchema>;

// Supplier entity interface
export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  columns: string[] | null;
  is_active: boolean;
}

// Schema for creating a supplier order
export const createSupplierOrderSchema = z.object({
  supplier_id: z.number().int().positive('ID de proveedor requerido'),
  order_id: z.number().int().positive().nullable().optional(),
  user_id: z.number().int().positive().nullable().optional(),
  status: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.string().min(1, 'La fecha de la orden es requerida'),
  items: z.array(z.record(z.string(), z.any())).optional(),
  total: z.number().min(0, 'El total no puede ser negativo').optional()
});

// Schema for editing a supplier order
export const editSupplierOrderSchema = createSupplierOrderSchema.partial();

// Infer types from Zod schemas
export type CreateSupplierOrderForm = z.infer<typeof createSupplierOrderSchema>;
export type EditSupplierOrderForm = z.infer<typeof editSupplierOrderSchema>;

// SupplierOrder entity interface
export interface SupplierOrder {
  id: number;
  supplier_id: number;
  order_id: number | null;
  user_id: number | null;
  status: string | null;
  notes: string | null;
  date: string;
  active: boolean;
  supplier_name?: string | null;
  supplier_phone?: string | null;
  order_total?: number | null;
  username?: string | null;
  supplierOrderItems?: any[];
  total?: number;
}
