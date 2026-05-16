import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(3, 'El nombre es obligatorio'),
  phone: z.string().min(10, 'El teléfono debete de tener al menos 10 digitos'),
  address: z.string().optional(),
  description: z.string().optional(),
  color: z.enum(['green', 'yellow', 'red']).nullable().optional()
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
  color?: 'green' | 'yellow' | 'red' | null;
  active: boolean; // 1 for active, 0 for inactive
}

export type ClientColor = 'green' | 'yellow' | 'red';

export const CLIENT_COLORS: { value: ClientColor; bg: string; name: string }[] = [
  { value: 'green', bg: 'bg-green-500', name: 'Verde' },
  { value: 'yellow', bg: 'bg-yellow-500', name: 'Amarillo' },
  { value: 'red', bg: 'bg-red-500', name: 'Rojo' }
];