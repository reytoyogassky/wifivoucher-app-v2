import Head from 'next/head'
import { useState, useEffect } from 'react'
import { Wifi, ShoppingBag, DollarSign, CreditCard, AlertTriangle, TrendingUp, Users, TrendingDown, ArrowUpRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot
} from 'recharts'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import StatCard from '../components/cards/StatCard'
import { CardSkeleton } from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import { getVoucherStats } from '../services/voucherService'
import { getSalesSummary, getSalesChartData } from '../services/salesService'
import { getDebtSummary } from '../services/debtService'
import { getAdminPerformance } from '../services/adminService'
import { formatCurrency } from '../utils/formatCurrency'
import { startOfToday, endOfToday } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'

function DashboardPage() {
  const [stats, setStats]         = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading]     = useState(true)
  const [period, setPeriod]       = useState('month')
  const { admin } = useAuth()

  useEffect(() => { loadStats() }, [period])

  async function loadStats() {
    setLoading(true)
    try {
      const now = new Date()
      let startDate, endDate, groupBy

      if (period === 'today') {
        startDate = startOfToday()
        endDate   = endOfToday()
        groupBy   = 'hour'
      } else if (period === 'week') {
        const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0)
        startDate = d.toISOString()
        endDate   = new Date().toISOString()
        groupBy   = 'day'
      } else if (period === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = d.toISOString()
        endDate   = new Date().toISOString()
        groupBy   = 'day'
      }

      const [voucherStats, salesSummary, debtSummary, adminPerf, chart] = await Promise.all([
        getVoucherStats(),
        getSalesSummary(startDate, endDate),
        getDebtSummary(),
        getAdminPerformance(startDate, endDate),
        getSalesChartData(startDate, endDate, groupBy),
      ])

      setStats({ voucherStats, salesSummary, debtSummary, adminPerf })
      setChartData(chart)
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Selamat datang, {admin?.full_name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Berikut ringkasan aktivitas sistem</p>
          </div>

          {/* Period filter */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
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
                    ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

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

        {/* Sales Chart */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                Grafik Penjualan
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {period === 'today' ? 'Per jam hari ini' : period === 'week' ? '7 hari terakhir' : 'Per hari bulan ini'}
              </p>
            </div>
            {!loading && stats?.salesSummary && (
              <div className="flex gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                  <span className="text-gray-500 dark:text-gray-400">Cash</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(stats.salesSummary.cashRevenue, { compact: true })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                  <span className="text-gray-500 dark:text-gray-400">Hutang</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(stats.salesSummary.debtRevenue, { compact: true })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-gray-500 dark:text-gray-400">Profit</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(stats.salesSummary.totalProfit, { compact: true })}</span>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="h-56 bg-gray-50 rounded-2xl animate-pulse" />
          ) : chartData.every(d => d.revenue === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Belum ada penjualan pada periode ini</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === 'today' ? 2 : 'preserveStartEnd'}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v}
                  width={44}
                />
                <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} content={<SalesTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cash"
                  name="Cash"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="debt"
                  name="Hutang"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#fbbf24', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Debt Stats */}
          {!loading && stats?.debtSummary && (
            <div className="card lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                <h3 className="font-bold text-gray-900 dark:text-white">Performa Admin</h3>
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
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Status Voucher</h3>
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              {[
                { label: 'Tersedia', key: 'available', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Terjual', key: 'sold', color: 'text-primary-600', bg: 'bg-primary-50' },
              ].map(item => (
                <div key={item.key} className={`${item.bg} rounded-2xl p-4`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
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
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
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
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <span className="text-lg w-6 text-center shrink-0">{rankIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{admin.full_name}</p>
          <p className="text-sm font-bold text-primary-600 shrink-0 ml-2">
            {formatCurrency(admin.total_revenue, { compact: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
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

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const cash   = payload.find(p => p.dataKey === 'cash')?.value   || 0
  const debt   = payload.find(p => p.dataKey === 'debt')?.value   || 0
  const profit = payload.find(p => p.dataKey === 'profit')?.value || 0
  const trx    = payload[0]?.payload?.transactions || 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"/>Cash</span>
          <span className="font-semibold text-indigo-600">{formatCurrency(cash)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Hutang</span>
          <span className="font-semibold text-amber-500">{formatCurrency(debt)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Profit</span>
          <span className="font-semibold text-emerald-600">{formatCurrency(profit)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1 flex justify-between gap-4">
          <span className="text-gray-400">Transaksi</span>
          <span className="font-semibold text-gray-700">{trx}x</span>
        </div>
      </div>
    </div>
  )
}

DashboardPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(DashboardPage)