import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  LayoutDashboard, ShoppingCart, History, CreditCard,
  Users, LogOut, Menu, X, Bell, Wifi, ChevronRight, Ticket, Archive,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import NotificationDropdown from '../ui/NotificationDropdown'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sell', label: 'Jual Voucher', icon: ShoppingCart },
  { href: '/sales', label: 'Riwayat Penjualan', icon: History },
  { href: '/debts', label: 'Data Hutang', icon: CreditCard },
  { href: '/vouchers', label: 'Manajemen Voucher', icon: Ticket },
  { href: '/archives', label: 'Arsip Bulanan', icon: Archive },
  { href: '/admins', label: 'Manajemen Admin', icon: Users, superadminOnly: true },
]

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const router = useRouter()
  const { admin, logout, isSuperAdmin } = useAuth()
  const { unreadCount } = useNotifications()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [router.pathname])

  const navItems = NAV_ITEMS.filter(item => !item.superadminOnly || isSuperAdmin)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col',
        'transform transition-transform duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-glow-sm">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">WifiSekre.net</p>
            <p className="text-xs text-gray-400">Aplikasi Manajemen Voucher WiFi</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin info */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{admin?.full_name}</p>
              <span className={clsx(
                'inline-block text-xs px-1.5 py-0.5 rounded-md font-medium',
                isSuperAdmin
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600'
              )}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const active = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-50 text-primary-700 shadow-glow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className={clsx('w-4.5 h-4.5', active ? 'text-primary-600' : 'text-gray-400')} />
                {item.label}
                {active && <ChevronRight className="ml-auto w-3.5 h-3.5 text-primary-400" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 lg:px-6 py-3.5">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <div className="flex-1">
              <Breadcrumb pathname={router.pathname} />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}

function Breadcrumb({ pathname }) {
  const labels = {
    '/dashboard': 'Dashboard',
    '/sell': 'Jual Voucher',
    '/sales': 'Riwayat Penjualan',
    '/debts': 'Data Hutang',
    '/vouchers': 'Manajemen Voucher',
    '/admins': 'Manajemen Admin',
    '/archives': 'Arsip Bulanan',
  }
  return (
    <h1 className="text-lg font-bold text-gray-900">{labels[pathname] || 'WiFi Voucher'}</h1>
  )
}

// HOC to wrap pages with layout
export function withAppLayout(Page) {
  Page.getLayout = (page) => <AppLayout>{page}</AppLayout>
  return Page
}