import { createRouter, RouterProvider, createHashHistory } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from '@/hooks/use-auth'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const hashHistory = createHashHistory()

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history: hashHistory,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // No retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        return failureCount < 3
      }
    }
  }
})

import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme'
import { enable as enableDarkMode, disable as disableDarkMode } from 'darkreader'
import UpdateBanner from './components/layout/UpdateBanner'

function AppWrapper() {
  // Initialize auth hook to check authentication status
  useAuth()

  return <RouterProvider router={router} />
}

function App() {
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    if (theme === 'dark') {
      enableDarkMode({
        brightness: 100,
        contrast: 95,
        sepia: 10
      });
    } else {
      disableDarkMode();
    }
  }, [theme])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Buscar todos los overlays de modales activos (que tengan clase fixed e inset-0)
      const activeOverlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0, [class*="fixed"][class*="inset-0"]'))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

      if (activeOverlays.length === 0) return;

      // Obtener el z-index de un elemento
      const getZIndex = (el: HTMLElement) => {
        const z = window.getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : parseInt(z, 10);
      };

      // Ordenar por z-index descendente, y en caso de empate, por orden de aparición en el DOM
      activeOverlays.sort((a, b) => {
        const zA = getZIndex(a);
        const zB = getZIndex(b);
        if (zA !== zB) return zB - zA;
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1;
      });

      const topOverlay = activeOverlays[0];
      if (!topOverlay) return;

      // Buscar botones en el modal superior
      const buttons = Array.from(topOverlay.querySelectorAll<HTMLButtonElement>('button'));

      // 1. Buscar botón con texto común de cancelación/cierre
      const textCancelButton = buttons.find(btn => {
        const text = btn.textContent?.trim().toLowerCase() || '';
        return text === 'cancelar' ||
          text === 'cerrar' ||
          text === 'ahora no' ||
          text === 'cerrar vista previa' ||
          text === 'cerrar sesión';
      });

      // 2. Buscar botón con icono de cerrar (X) de lucide
      const xButton = buttons.find(btn =>
        btn.querySelector('.lucide-x') ||
        btn.querySelector('svg.lucide-x') ||
        (btn.querySelector('svg') && btn.innerHTML.includes('lucide-x'))
      );

      // Priorizar el botón de cancelar/cerrar o el botón X
      const closeTarget = textCancelButton || xButton;

      if (closeTarget && !closeTarget.disabled) {
        e.preventDefault();
        e.stopPropagation();
        closeTarget.click();
      } else if (!textCancelButton && !xButton) {
        // Fallback: si no hay un botón de cierre obvio, simular click en el propio overlay
        // por si tiene un callback de cierre asignado directamente
        topOverlay.click();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
      <UpdateBanner />
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition='top-right'
      />
    </QueryClientProvider>
  )
}

export default App
