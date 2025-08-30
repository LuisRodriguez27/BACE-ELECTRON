import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(3, 'El nombre es obligatorio'),
  phone: z.string().min(10, 'El teléfono debete de tener al menos 10 digitos'),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const editClientSchema = createClientSchema.partial();

export type CreateClientForm = z.infer<typeof createClientSchema>;
export type EditClientForm = z.infer<typeof editClientSchema>;

export interface Client {
  id: number;
  name: string;
  phone: string;
  address?: string;
  description?: string;
  active: number; // 1 for active, 0 for inactive
}