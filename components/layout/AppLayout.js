import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  LayoutDashboard, ShoppingCart, History, CreditCard,
  Users, LogOut, Menu, X, Bell, Wifi, ChevronRight, Ticket, Archive,
  Sun, Moon, Activity,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import NotificationDropdown from '../ui/NotificationDropdown'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/sell',       label: 'Jual Voucher',         icon: ShoppingCart },
  { href: '/sales',      label: 'Riwayat Penjualan',   icon: History },
  { href: '/debts',      label: 'Data Hutang',          icon: CreditCard },
  { href: '/vouchers',   label: 'Manajemen Voucher',    icon: Ticket },
  { href: '/archives',   label: 'Arsip Bulanan',        icon: Archive },
  { href: '/admins',     label: 'Manajemen Admin',      icon: Users,     superadminOnly: true },
  { href: '/logs',       label: 'Log Aktivitas',        icon: Activity,  superadminOnly: true },
]

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const router                        = useRouter()
  const { admin, logout, isSuperAdmin } = useAuth()
  const { unreadCount }               = useNotifications()
  const { isDark, toggleTheme }       = useTheme()

  useEffect(() => { setSidebarOpen(false) }, [router.pathname])

  const navItems = NAV_ITEMS.filter(item => !item.superadminOnly || isSuperAdmin)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-200">

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-800',
        'transform transition-transform duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-glow-sm shrink-0">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">WifiSekre.net</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Manajemen Voucher WiFi</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin info */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">
                {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{admin?.full_name}</p>
              <span className={clsx(
                'inline-block text-xs px-1.5 py-0.5 rounded-md font-medium',
                isSuperAdmin
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon   = item.icon
            const active = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary-50 text-primary-700 shadow-glow-sm dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                )}
              >
                <Icon className={clsx('w-4 h-4 shrink-0', active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500')} />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="ml-auto w-3.5 h-3.5 text-primary-400 shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 lg:px-6 py-3.5 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <Breadcrumb pathname={router.pathname} />
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
              className={clsx(
                'relative w-[52px] h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 overflow-hidden',
                isDark
                  ? 'bg-primary-600 dark:focus:ring-offset-gray-900'
                  : 'bg-gray-300'
              )}
            >
              {/* Track icons */}
              <Sun  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 transition-opacity duration-200" style={{ opacity: isDark ? 0 : 1 }} />
              <Moon className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-100 transition-opacity duration-200" style={{ opacity: isDark ? 1 : 0 }} />
              {/* Thumb */}
              <span className={clsx(
                'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300',
                isDark ? 'translate-x-[26px]' : 'translate-x-0.5'
              )} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
        <main className="flex-1 p-4 lg:p-6 animate-fade-in pb-24 lg:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center px-2 pb-safe">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/sales',     label: 'Riwayat',   icon: History },
            { href: '/debts',     label: 'Hutang',     icon: CreditCard },
            { href: '/vouchers',  label: 'Voucher',    icon: Ticket },
          ].map(item => {
            const Icon   = item.icon
            const active = router.pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center gap-0.5 py-2.5">
                <Icon className={clsx('w-5 h-5', active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500')} />
                <span className={clsx('text-[10px] font-medium', active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500')}>{item.label}</span>
              </Link>
            )
          })}
          {/* FAB Jual */}
          <Link href="/sell" className="flex flex-col items-center -mt-6 mx-1 gap-0.5">
            <span className={clsx(
              'w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-glow transition-all duration-150',
              router.pathname === '/sell'
                ? 'bg-primary-600 scale-105 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                : 'bg-primary-500 hover:bg-primary-600 hover:scale-105'
            )}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </span>
            <span className={clsx(
              'text-[10px] font-bold',
              router.pathname === '/sell' ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
            )}>Jual</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}

function Breadcrumb({ pathname }) {
  const labels = {
    '/dashboard': 'Dashboard',
    '/sell':      'Jual Voucher',
    '/sales':     'Riwayat Penjualan',
    '/debts':     'Data Hutang',
    '/vouchers':  'Manajemen Voucher',
    '/admins':    'Manajemen Admin',
    '/archives':  'Arsip Bulanan',
    '/logs':      'Log Aktivitas',
  }
  return (
    <h1 className="text-lg font-bold text-gray-900 dark:text-white">{labels[pathname] || 'WiFi Voucher'}</h1>
  )
}

export function withAppLayout(Page) {
  Page.getLayout = (page) => <AppLayout>{page}</AppLayout>
  return Page
}