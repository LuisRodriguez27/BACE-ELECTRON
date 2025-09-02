import { z } from 'zod';

export const createUserSchema = z.object({
	username: z.string().min(1, 'El nombre de usuario es obligatorio'),
	password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const editUserSchema = createUserSchema.partial();

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type EditUserForm = z.infer<typeof editUserSchema>;

export interface User {
	id: number;
	username: string;
	password?: string; 
	active: number;
	userPermissions?: {
		permission_id: number;
		permission_name: string;
		active: number;
	}[];
}