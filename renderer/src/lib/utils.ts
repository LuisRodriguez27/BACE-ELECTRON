import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function para validar autenticación
export function isValidAuthResponse(response: any): response is { success: boolean; message: string; user?: any } {
  return response && 
         typeof response === 'object' && 
         typeof response.success === 'boolean' &&
         typeof response.message === 'string'
}

// Utility function para manejar errores de API
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Error desconocido'
}
