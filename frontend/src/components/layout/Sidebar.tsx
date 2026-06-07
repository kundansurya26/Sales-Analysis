import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  TrendingUp, BarChart3, LogOut, Sun, Moon, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/context/authStore'
import { useThemeStore } from '@/context/themeStore'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/sales',      label: 'Sales Analytics',  icon: ShoppingCart },
  { to: '/products',   label: 'Products',         icon: Package },
  { to: '/customers',  label: 'Customers',        icon: Users },
  { to: '/forecasting',label: 'Forecasting',      icon: TrendingUp },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 dark:bg-gray-950 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">SalesDash</p>
          <p className="text-xs text-gray-400">Analytics Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Menu</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + theme */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.full_name?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
