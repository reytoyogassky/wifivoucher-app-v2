export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Wifisekre.net',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  defaultPageLimit: 20,
  debtDueDays: 7,
  sessionKey: 'wvm_session',
  currency: 'IDR',
  locale: 'id-ID',
}

export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  sell: '/sell',
  sales: '/sales',
  debts: '/debts',
  admins: '/admins',
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'debt', label: 'Hutang', icon: '📋' },
]

export const VOUCHER_STATUSES = [
  { value: 'available', label: 'Tersedia', color: 'green' },
  { value: 'sold', label: 'Terjual', color: 'purple' },
  { value: 'expired', label: 'Kadaluarsa', color: 'red' },
  { value: 'reserved', label: 'Dipesan', color: 'yellow' },
]

export const DEBT_STATUSES = [
  { value: 'unpaid', label: 'Belum Lunas', color: 'red' },
  { value: 'partial', label: 'Sebagian', color: 'yellow' },
  { value: 'paid', label: 'Lunas', color: 'green' },
]

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/sell', label: 'Jual Voucher', icon: 'ShoppingCart' },
  { href: '/sales', label: 'Riwayat Penjualan', icon: 'History' },
  { href: '/debts', label: 'Data Hutang', icon: 'CreditCard' },
  { href: '/admins', label: 'Manajemen Admin', icon: 'Users', superadminOnly: true },
]
