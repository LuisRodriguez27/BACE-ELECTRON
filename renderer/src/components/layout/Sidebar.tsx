import React, { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { 
  ShoppingCart, 
  Users, 
  Package, 
  History, 
  UserCog,
  Menu,
  Home,
  Calculator,
  BarChart3,
  Zap,
  DollarSign,
  MessageCircle,
  Info,
  HandCoins,
  Moon,
  Sun,
  Truck,
  Printer,
  ClipboardList,
  ShoppingBasket,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebarStore } from '@/store/sidebar'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { useThemeStore } from '@/store/theme'
import AboutModal from './AboutModal'

interface MenuItem {
  id: string
  label: string
  icon: React.ElementType
  path: string
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard'
  },
  {
    id: 'orders',
    label: 'Órdenes',
    icon: ShoppingCart,
    path: '/dashboard/orders'
  },
  {
    id: 'simple-orders',
    label: 'Órdenes Rápidas',
    icon: Zap,
    path: '/dashboard/simple-orders'
  },
  {
    id: 'history',
    label: 'Historial de Órdenes',
    icon: History,
    path: '/dashboard/history'
  },
  {
    id: 'budgets',
    label: 'Presupuestos',
    icon: Calculator,
    path: '/dashboard/budgets'
  },
  {
    id: 'products',
    label: 'Productos',
    icon: Package,
    path: '/dashboard/products'
  },
  {
    id: 'payments',
    label: 'Pagos',
    icon: DollarSign,
    path: '/dashboard/payments'
  },
  {
    id: 'cash-session',
    label: 'Sesión de Caja',
    icon: HandCoins,
    path: '/dashboard/cash-session'
  },
  {
    id: 'print-logs',
    label: 'Bitácora de Impresión',
    icon: Printer,
    path: '/dashboard/print-logs'
  },
  {
    id: 'production-logs',
    label: 'Bitácora de Producción',
    icon: ClipboardList,
    path: '/dashboard/production-logs'
  },
  {
    id: 'shopping-list',
    label: 'Lista de Compras',
    icon: ShoppingBasket,
    path: '/dashboard/shopping-list'
  },
  {
    id: 'stats',
    label: 'Gráficas de Ventas',
    icon: BarChart3,
    path: '/dashboard/stats'
  },
  {
    id: 'clients',
    label: 'Clientes',
    icon: Users,
    path: '/dashboard/clients'
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    icon: Truck,
    path: '/dashboard/suppliers'
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: UserCog,
    path: '/dashboard/users'
  }
]

const Sidebar: React.FC = () => {
  const { isExpanded, toggleSidebar } = useSidebarStore()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const { canAccess } = usePermissions()
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [isBottomExpanded, setIsBottomExpanded] = useState(false)
  const activeItemRef = useRef<HTMLAnchorElement | null>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false })

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const active = activeItemRef.current
      if (active) {
        setIndicator({ top: active.offsetTop, height: active.offsetHeight, visible: true })
      } else {
        setIndicator((prev) => ({ ...prev, visible: false }))
      }
    }
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [location.pathname, isExpanded])

  const bottomActions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      iconColor: 'text-green-400 group-hover:text-white',
      hoverBg: 'hover:bg-green-700',
      onClick: () => window.api.openWhatsApp()
    },
    {
      id: 'theme',
      label: theme === 'light' ? 'Modo Oscuro' : 'Modo Claro',
      icon: theme === 'light' ? Moon : Sun,
      iconColor: theme === 'light'
        ? 'text-indigo-400 group-hover:text-indigo-300'
        : 'text-yellow-400 group-hover:text-yellow-300',
      hoverBg: 'hover:bg-gray-800',
      onClick: toggleTheme
    },
    {
      id: 'about',
      label: 'Acerca de BACE',
      icon: Info,
      iconColor: 'text-blue-400 group-hover:text-blue-300',
      hoverBg: 'hover:bg-gray-800',
      onClick: () => setIsAboutOpen(true)
    }
  ]

  return (
    <>
      <div className={cn(
        'flex flex-col h-screen overflow-hidden bg-gray-900 text-white transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64' : 'w-17'
      )}>
      {/* Header con botón de toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className={cn(
          'transition-opacity duration-300',
          isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
        )}>
          <h2 className="text-xl font-bold text-white">BACE</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-white hover:bg-gray-700 shrink-0"
        >
          <Menu size={20} className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="relative flex-1 overflow-y-auto sidebar-scroll px-2 py-4">
        <div
          className={cn(
            'absolute left-2 right-2 top-0 bg-blue-600 rounded-lg transition-all duration-300 ease-in-out pointer-events-none',
            indicator.visible ? 'opacity-100' : 'opacity-0'
          )}
          style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
        />
        <div className="space-y-2">
        {menuItems.map((item) => {
          // Solo ocultar la opción de Usuarios si no tiene permiso
          if (item.id === 'users' && !canAccess('Gestionar Usuario')) {
            return null
          }

          if (item.id === 'suppliers' && !canAccess('Ver Mayoristas')) {
            return null
          }

          if (item.id === 'stats' && !canAccess('Estadisticas')) {
            return null
          } 

          if (item.id === 'payments' && !canAccess('Ver Pagos')) {
            return null
          }

          if (item.id === 'cash-session' && !canAccess('Ver Caja')) {
            return null
          }

          if (item.id === 'print-logs' && !canAccess('Ver Bitacora de Impresion')) {
            return null
          }

          if (item.id === 'production-logs' && !canAccess('Ver Bitacora de Produccion')) {
            return null
          }

          if (item.id === 'shopping-list' && !canAccess('Ver Lista de Compras')) {
            return null
          }

          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.id}
              ref={isActive ? activeItemRef : undefined}
              to={item.path}
              className={cn(
                'relative z-10 flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group min-w-10',
                isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                !isExpanded && 'justify-center'
              )}
            >
              <Icon size={20} className="shrink-0 w-5 h-5" />
              <span className={cn(
                'ml-3 transition-all duration-300 whitespace-nowrap',
                isExpanded 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
        </div>
      </nav>

      {/* WhatsApp, tema y Acerca de al fondo */}
      <div className="px-2 py-4 border-t border-gray-700">
        {isExpanded ? (
          <div className="flex flex-col gap-1">
            <div className={cn(
              'flex items-center gap-1',
              isBottomExpanded ? 'flex-col' : 'flex-row justify-between'
            )}>
              <div className={cn(
                'flex gap-1',
                isBottomExpanded ? 'flex-col w-full' : 'flex-row'
              )}>
                {bottomActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      title={action.label}
                      className={cn(
                        'flex items-center rounded-lg transition-colors duration-200 group',
                        action.hoverBg,
                        'text-gray-300 hover:text-white',
                        isBottomExpanded ? 'w-full px-3 py-2' : 'justify-center p-2'
                      )}
                    >
                      <Icon size={20} className={cn('shrink-0 w-5 h-5', action.iconColor)} />
                      {isBottomExpanded && (
                        <span className="ml-3 whitespace-nowrap">{action.label}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setIsBottomExpanded((v) => !v)}
                title={isBottomExpanded ? 'Contraer' : 'Expandir'}
                className={cn(
                  'flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors duration-200 shrink-0',
                  isBottomExpanded ? 'w-full py-1.5' : 'p-2'
                )}
              >
                {isBottomExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bottomActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  title={action.label}
                  className={cn(
                    'w-full flex items-center justify-center px-3 py-2 rounded-lg transition-colors duration-200 group min-w-10',
                    action.hoverBg,
                    'text-gray-300 hover:text-white'
                  )}
                >
                  <Icon size={20} className={cn('shrink-0 w-5 h-5', action.iconColor)} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Configuraciones al final */}
      {/* <div className="px-2 py-4 border-t border-gray-700">
        <Link
          to="/dashboard/configurations"
          className={cn(
            'flex items-center px-3 py-2 rounded-lg transition-colors duration-200',
            location.pathname === '/dashboard/configurations'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          )}
        >
          <Settings size={20} className="flex-shrink-0 w-5 h-5" />
          <span className={cn(
            'ml-3 transition-all duration-300',
            isExpanded 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          )}>
            Configuraciones
          </span>
        </Link>
      </div> */}
    </div>

      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </>
  )
}

export default Sidebar
