import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Wifi, ShoppingBag, DollarSign, CreditCard, AlertTriangle, TrendingUp, Users, Award, ShoppingCart, ChevronRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import StatCard from '../components/cards/StatCard'
import { CardSkeleton } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import { getVoucherStats } from '../services/voucherService'
import { getSalesSummary } from '../services/salesService'
import { getDebtSummary } from '../services/debtService'
import { getAdminPerformance } from '../services/adminService'
import { formatCurrency } from '../utils/formatCurrency'
import { startOfToday, endOfToday } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  const { admin } = useAuth()

  useEffect(() => {
    loadStats()
  }, [period])

  async function loadStats() {
    setLoading(true)
    try {
      const now = new Date()
      let startDate, endDate

      if (period === 'today') {
        startDate = startOfToday()
        endDate = endOfToday()
      } else if (period === 'week') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        startDate = d.toISOString()
        endDate = new Date().toISOString()
      } else if (period === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = d.toISOString()
        endDate = new Date().toISOString()
      }

      const [voucherStats, salesSummary, debtSummary, adminPerf] = await Promise.all([
        getVoucherStats(),
        getSalesSummary(startDate, endDate),
        getDebtSummary(),
        getAdminPerformance(startDate, endDate),
      ])

      setStats({ voucherStats, salesSummary, debtSummary, adminPerf })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Dashboard — WiFi Voucher Manager</title></Head>

      <div className="space-y-6 max-w-7xl">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Selamat datang, {admin?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Berikut ringkasan aktivitas sistem</p>
          </div>

          {/* Period filter */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { key: 'today', label: 'Hari ini' },
              { key: 'week', label: '7 Hari' },
              { key: 'month', label: 'Bulan ini' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === opt.key
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Quick Sell Banner */}
        <Link
          href="/sell"
          className="lg:hidden flex items-center justify-between bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl px-5 py-4 shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">Jual Voucher</p>
              <p className="text-primary-100 text-xs mt-0.5">
                {loading ? '...' : `${stats?.voucherStats?.available ?? 0} voucher tersedia`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl">
            <span className="text-white font-semibold text-sm">Mulai</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </Link>

        {/* Stats Grid */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              title="Voucher Tersedia"
              value={stats?.voucherStats?.available ?? 0}
              subtitle={`${stats?.voucherStats?.sold ?? 0} terjual total`}
              icon={Wifi}
              color="purple"
            />
            <StatCard
              title="Total Penjualan"
              value={stats?.salesSummary?.totalTransactions ?? 0}
              subtitle="transaksi"
              icon={ShoppingBag}
              color="blue"
            />
            <StatCard
              title="Pendapatan Cash"
              value={formatCurrency(stats?.salesSummary?.cashRevenue, { compact: true })}
              subtitle={formatCurrency(stats?.salesSummary?.totalRevenue, { compact: true }) + ' total'}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Hutang Belum Lunas"
              value={formatCurrency(stats?.debtSummary?.totalRemaining, { compact: true })}
              subtitle={`${stats?.debtSummary?.overdueCount ?? 0} overdue`}
              icon={CreditCard}
              color={stats?.debtSummary?.overdueCount > 0 ? 'red' : 'amber'}
            />
            <StatCard
              title="Profit Periode"
              value={formatCurrency(stats?.salesSummary?.totalProfit, { compact: true })}
              subtitle="cash + hutang terbayar"
              icon={TrendingUp}
              color="purple"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Debt Stats */}
          {!loading && stats?.debtSummary && (
            <div className="card lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary-500" />
                  Statistik Hutang
                </h3>
              </div>
              <div className="space-y-3">
                <DebtStat
                  label="Belum Lunas"
                  count={stats.debtSummary.unpaidCount}
                  color="red"
                />
                <DebtStat
                  label="Dibayar Sebagian"
                  count={stats.debtSummary.partialCount}
                  color="yellow"
                />
                <DebtStat
                  label="Lunas"
                  count={stats.debtSummary.paidCount}
                  color="green"
                />
                {stats.debtSummary.overdueCount > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700 font-medium">
                      {stats.debtSummary.overdueCount} hutang melewati jatuh tempo!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Performance */}
          {!loading && (
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <h3 className="font-bold text-gray-900">Performa Admin</h3>
              </div>

              {!stats?.adminPerf?.length ? (
                <div className="py-8 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada data penjualan pada periode ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.adminPerf.slice(0, 5).map((a, i) => (
                    <AdminPerfRow key={a.admin_id} admin={a} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voucher Status */}
        {!loading && stats?.voucherStats && (
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">Status Voucher</h3>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              {[
                { label: 'Tersedia', key: 'available', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Terjual', key: 'sold', color: 'text-primary-600', bg: 'bg-primary-50' },
              ].map(item => (
                <div key={item.key} className={`${item.bg} rounded-2xl p-4`}>
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-3xl font-bold ${item.color}`}>
                    {stats.voucherStats[item.key] ?? 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">voucher</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function DebtStat({ label, count, color }) {
  const bgColor = { red: 'bg-red-500', yellow: 'bg-amber-500', green: 'bg-emerald-500' }
  const badgeVariant = { red: 'red', yellow: 'yellow', green: 'green' }
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <Badge variant={badgeVariant[color]}>{count}</Badge>
    </div>
  )
}

function AdminPerfRow({ admin, rank }) {
  const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  const pct = admin.total_revenue > 0
    ? Math.min((admin.cash_revenue / admin.total_revenue) * 100, 100)
    : 0

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <span className="text-lg w-6 text-center shrink-0">{rankIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{admin.full_name}</p>
          <p className="text-sm font-bold text-primary-600 shrink-0 ml-2">
            {formatCurrency(admin.total_revenue, { compact: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 shrink-0">{admin.total_sales} trx</span>
        </div>
      </div>
    </div>
  )
}

DashboardPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(DashboardPage)