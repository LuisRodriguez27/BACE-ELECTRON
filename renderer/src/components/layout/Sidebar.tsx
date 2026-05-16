import React, { useState } from 'react'
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
  HandCoins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebarStore } from '@/store/sidebar'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
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
    id: 'users',
    label: 'Usuarios',
    icon: UserCog,
    path: '/dashboard/users'
  }
]

const Sidebar: React.FC = () => {
  const { isExpanded, toggleSidebar } = useSidebarStore()
  const location = useLocation()
  const { canAccess } = usePermissions()
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  return (
    <>
      <div className={cn(
        'flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out',
        isExpanded ? 'w-64' : 'w-16'
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
      <nav className="flex-1 px-2 py-4 space-y-2">
        {menuItems.map((item) => {
          // Solo ocultar la opción de Usuarios si no tiene permiso
          if (item.id === 'users' && !canAccess('Gestionar Usuario')) {
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

          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group min-w-10',
                isActive 
                  ? 'bg-blue-600 text-white' 
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
      </nav>

      {/* WhatsApp y Acerca de al fondo */}
      <div className="px-2 py-4 border-t border-gray-700 flex flex-col gap-2">
        <button
          onClick={() => window.api.openWhatsApp()}
          title="WhatsApp Web"
          className={cn(
            'w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group min-w-10',
            'text-gray-300 hover:bg-green-700 hover:text-white',
            !isExpanded && 'justify-center'
          )}
        >
          <MessageCircle size={20} className="shrink-0 w-5 h-5 text-green-400 group-hover:text-white" />
          <span className={cn(
            'ml-3 transition-all duration-300 whitespace-nowrap',
            isExpanded
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          )}>
            WhatsApp
          </span>
        </button>

        <button
          onClick={() => setIsAboutOpen(true)}
          title="Acerca de BACE"
          className={cn(
            'w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-200 group min-w-10',
            'text-gray-300 hover:bg-gray-800 hover:text-white',
            !isExpanded && 'justify-center'
          )}
        >
          <Info size={20} className="shrink-0 w-5 h-5 text-blue-400 group-hover:text-blue-300" />
          <span className={cn(
            'ml-3 transition-all duration-300 whitespace-nowrap',
            isExpanded
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          )}>
            Acerca de BACE
          </span>
        </button>
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
