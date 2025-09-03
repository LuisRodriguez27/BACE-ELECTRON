/**
 * Extrae el mensaje real de error de los errores de IPC de Electron
 * @param error - Error object from Electron IPC
 * @returns Clean error message
 */
export function extractErrorMessage(error: any): string {
  if (!error?.message) {
    return 'Ha ocurrido un error inesperado';
  }

  // Patron para errores de IPC de Electron: "Error invoking remote method 'method:name': Error: mensaje real"
  const ipcErrorMatch = error.message.match(/Error invoking remote method.*?: Error: (.+)/);
  
  if (ipcErrorMatch) {
    return ipcErrorMatch[1]; // Retornar solo el mensaje real
  }

  // Si no es un error de IPC, devolver el mensaje tal como está
  return error.message;
}

/**
 * Muestra un mensaje de error más amigable basado en el tipo de error
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  const message = extractErrorMessage(error);
  
  // Mapear algunos errores comunes a mensajes más amigables si es necesario
  const errorMappings: Record<string, string> = {
    'El username ya está en uso': 'Este nombre de usuario ya existe. Por favor, elige otro.',
    'Username es requerido': 'El nombre de usuario es obligatorio.',
    'La contraseña debe tener al menos 6 caracteres': 'La contraseña debe tener mínimo 6 caracteres.',
    'Usuario no encontrado': 'No se pudo encontrar el usuario solicitado.',
    'ID de usuario inválido': 'El identificador del usuario no es válido.',
  };

  return errorMappings[message] || message;
}
