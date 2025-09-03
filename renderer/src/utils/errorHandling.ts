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
    // Errores de usuarios
    'El username ya está en uso': 'Este nombre de usuario ya existe. Por favor, elige otro.',
    'Username es requerido': 'El nombre de usuario es obligatorio.',
    'La contraseña debe tener al menos 6 caracteres': 'La contraseña debe tener mínimo 6 caracteres.',
    'Usuario no encontrado': 'No se pudo encontrar el usuario solicitado.',
    'ID de usuario inválido': 'El identificador del usuario no es válido.',
    
    // Errores de clientes
    'Ya existe un cliente con este teléfono': 'Este número de teléfono ya está registrado. Por favor, usa otro.',
    'Ya existe otro cliente con este teléfono': 'Este número de teléfono ya pertenece a otro cliente.',
    'Nombre y teléfono son requeridos': 'El nombre y teléfono son obligatorios.',
    'El nombre debe tener al menos 3 caracteres': 'El nombre debe tener mínimo 3 caracteres.',
    'El teléfono debe tener al menos 10 dígitos': 'El teléfono debe tener mínimo 10 dígitos.',
    'El teléfono contiene caracteres inválidos': 'El teléfono solo puede contener números, espacios, guiones y paréntesis.',
    'Cliente no encontrado': 'No se pudo encontrar el cliente solicitado.',
    'ID de cliente inválido': 'El identificador del cliente no es válido.',
    
    // Errores de productos
    'Ya existe un producto con este número de serie': 'Este número de serie ya está registrado. Por favor, usa otro.',
    'Ya existe otro producto con este número de serie': 'Este número de serie ya pertenece a otro producto.',
    'El nombre del producto es requerido': 'El nombre del producto es obligatorio.',
    'El nombre del producto no puede estar vacío': 'El nombre del producto no puede estar vacío.',
    'El precio es requerido y debe ser un número válido': 'El precio debe ser un número válido.',
    'El precio debe ser mayor o igual a cero': 'El precio debe ser mayor o igual a cero.',
    'Producto no encontrado': 'No se pudo encontrar el producto solicitado.',
    'ID de producto inválido': 'El identificador del producto no es válido.',
  };

  return errorMappings[message] || message;
}
