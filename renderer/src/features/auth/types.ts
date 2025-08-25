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

export interface UserData {
  id: number;
  username: string;
  permissions: string[];
}

export interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
}

export interface LoginData {
  username: string,
  password: string
}
