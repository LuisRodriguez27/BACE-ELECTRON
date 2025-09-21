import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export function usePermissions() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userPermissions = useAuthStore((state) => state.userPermissions);

  /**
   * Verifica si el usuario tiene un permiso específico
   * Si no lo tiene, muestra una alerta
   * @param permission - Nombre del permiso a validar
   * @param showAlert - Si mostrar o no la alerta (por defecto true)
   * @returns boolean - true si tiene permiso, false si no
   */
  const checkPermission = (permission: string, showAlert: boolean = true): boolean => {
    const hasAccess = hasPermission(permission);
    
    console.log(`🔍 Verificando permiso: "${permission}"`);
    console.log('📋 Permisos del usuario:', userPermissions);
    console.log('🏁 Resultado:', hasAccess ? '✅ PERMITIDO' : '❌ DENEGADO');
    
    if (!hasAccess && showAlert) {
      toast.error('No tienes permiso para realizar esta acción');
    }
    
    return hasAccess;
  };

  /**
   * Verifica permiso sin mostrar alerta
   */
  const canAccess = (permission: string): boolean => {
    return hasPermission(permission);
  };

  return {
    checkPermission,
    canAccess,
    hasPermission,
    userPermissions
  };
}
