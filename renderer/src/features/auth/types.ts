import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la nueva contraseña')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type LoginForm = z.infer<typeof loginSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// Usamos el mismo tipo de User que en features/users para evitar conflictos
export interface User {
  id: number;
  username: string;
  active: number;
}

// Función helper para convertir active number a boolean
export function isUserActive(user: User): boolean {
  return user.active === 1;
}

export interface Business {
  id: number;
  name: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface AuthState {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  error: string | null;
}
