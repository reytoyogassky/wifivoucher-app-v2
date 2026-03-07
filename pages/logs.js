import Head from 'next/head'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, LogIn, LogOut, ShoppingCart, FileText, CreditCard,
  Upload, Trash2, UserPlus, UserMinus, Archive, Filter,
  RefreshCw, ChevronLeft, ChevronRight, Search, X, Shield,
  Radio,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import { TableSkeleton } from '../components/ui/Skeleton'
import { getLogs, LOG_ACTIONS } from '../services/logService'
import { getAdmins } from '../services/adminService'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

// ── Konfigurasi tampilan per aksi ───────────────────────────
const ACTION_CONFIG = {
  [LOG_ACTIONS.LOGIN]:               { label: 'Login',             icon: LogIn,      color: 'green',  variant: 'green'  },
  [LOG_ACTIONS.LOGOUT]:              { label: 'Logout',            icon: LogOut,     color: 'gray',   variant: 'gray'   },
  [LOG_ACTIONS.SELL]:                { label: 'Jual Voucher',      icon: ShoppingCart, color: 'blue', variant: 'blue'   },
  [LOG_ACTIONS.DEBT_CREATE]:         { label: 'Hutang Baru',       icon: FileText,   color: 'yellow', variant: 'yellow' },
  [LOG_ACTIONS.DEBT_PAY]:            { label: 'Bayar Hutang',      icon: CreditCard, color: 'teal',   variant: 'green'  },
  [LOG_ACTIONS.DEBT_PAY_FULL]:       { label: 'Lunas Hutang',      icon: CreditCard, color: 'green',  variant: 'green'  },
  [LOG_ACTIONS.VOUCHER_UPLOAD]:      { label: 'Upload Voucher',    icon: Upload,     color: 'purple', variant: 'purple' },
  [LOG_ACTIONS.VOUCHER_DELETE]:      { label: 'Hapus Voucher',     icon: Trash2,     color: 'red',    variant: 'red'    },
  [LOG_ACTIONS.VOUCHER_BULK_DELETE]: { label: 'Hapus Massal',      icon: Trash2,     color: 'red',    variant: 'red'    },
  [LOG_ACTIONS.ADMIN_CREATE]:        { label: 'Tambah Admin',      icon: UserPlus,   color: 'indigo', variant: 'purple' },
  [LOG_ACTIONS.ADMIN_DELETE]:        { label: 'Hapus Admin',       icon: UserMinus,  color: 'red',    variant: 'red'    },
  [LOG_ACTIONS.ARCHIVE_CREATE]:      { label: 'Tutup Buku',        icon: Archive,    color: 'orange', variant: 'yellow' },
}

const DEFAULT_CONFIG = { label: 'Aktivitas', icon: Activity, color: 'gray', variant: 'gray' }

const PAGE_SIZE = 50

function LogsPage() {
  const { isSuperAdmin } = useAuth()

  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [admins, setAdmins]       = useState([])
  const [isLive, setIsLive]       = useState(true)   // realtime toggle
  const [newCount, setNewCount]   = useState(0)      // badge log baru masuk
  const channelRef = useRef(null)

  // Filter state
  const [filterAdmin,  setFilterAdmin]  = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterStart,  setFilterStart]  = useState('')
  const [filterEnd,    setFilterEnd]    = useState('')
  const [searchText,   setSearchText]   = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Load admins untuk dropdown filter ───────────────────
  useEffect(() => {
    getAdmins().then(setAdmins).catch(console.error)
  }, [])

  // ── Realtime subscription ────────────────────────────────
  useEffect(() => {
    if (!isLive) {
      channelRef.current?.unsubscribe()
      channelRef.current = null
      return
    }

    channelRef.current = supabase
      .channel('admin_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' },
        (payload) => {
          const newLog = payload.new
          // Hanya inject langsung jika di halaman 1 dan tidak ada filter aktif
          if (page === 1 && !filterAdmin && !filterAction && !filterStart && !filterEnd) {
            setLogs(prev => [newLog, ...prev.slice(0, PAGE_SIZE - 1)])
            setTotal(prev => prev + 1)
            setNewCount(prev => prev + 1)
            // Reset badge setelah 3 detik
            setTimeout(() => setNewCount(0), 3000)
          } else {
            // Kalau ada filter/halaman lain, hanya update counter
            setNewCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [isLive, page, filterAdmin, filterAction, filterStart, filterEnd])

  // ── Load logs ────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await getLogs({
        page,
        limit:     PAGE_SIZE,
        adminId:   filterAdmin  || undefined,
        action:    filterAction || undefined,
        startDate: filterStart  ? new Date(filterStart).toISOString()                     : undefined,
        endDate:   filterEnd    ? new Date(filterEnd + 'T23:59:59').toISOString()         : undefined,
      })
      setLogs(data || [])
      setTotal(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterAdmin, filterAction, filterStart, filterEnd])

  useEffect(() => { loadLogs() }, [loadLogs])

  // Reset page saat filter berubah
  useEffect(() => { setPage(1) }, [filterAdmin, filterAction, filterStart, filterEnd])

  // Filter teks lokal (description)
  const displayedLogs = searchText.trim()
    ? logs.filter(l =>
        l.description.toLowerCase().includes(searchText.toLowerCase()) ||
        l.admin_name.toLowerCase().includes(searchText.toLowerCase())
      )
    : logs

  const hasFilter = filterAdmin || filterAction || filterStart || filterEnd
  function clearFilters() {
    setFilterAdmin(''); setFilterAction(''); setFilterStart(''); setFilterEnd('')
    setSearchText(''); setPage(1)
  }

  // ── Ringkasan per aksi ───────────────────────────────────
  const summary = logs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1
    return acc
  }, {})

  return (
    <>
      <Head><title>Admin Log — WifiSekre.net</title></Head>

      <div className="space-y-6 max-w-7xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary-500" />
              Log Aktivitas Admin
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Rekam jejak semua aksi yang dilakukan admin
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge log baru */}
            {newCount > 0 && (
              <button
                onClick={() => { setNewCount(0); setPage(1); loadLogs() }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-full animate-pulse hover:bg-primary-600 transition"
              >
                <span className="w-2 h-2 bg-white rounded-full" />
                {newCount} log baru — klik refresh
              </button>
            )}

            {/* Tombol Live */}
            <button
              onClick={() => setIsLive(v => !v)}
              title={isLive ? 'Realtime aktif — klik untuk pause' : 'Realtime pause — klik untuk aktifkan'}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              )}
            >
              <Radio className={clsx('w-3.5 h-3.5', isLive && 'animate-pulse')} />
              {isLive ? 'Live' : 'Pause'}
            </button>

            <span className="text-xs text-gray-400">{total} log</span>
            <button
              onClick={loadLogs}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-primary-600 transition"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Summary chips */}
        {!loading && Object.keys(summary).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).map(([action, count]) => {
              const cfg = ACTION_CONFIG[action] || DEFAULT_CONFIG
              const Icon = cfg.icon
              return (
                <button
                  key={action}
                  onClick={() => setFilterAction(filterAction === action ? '' : action)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    filterAction === action
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                  <span className="bg-black/10 rounded-full px-1.5">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Filter bar */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search teks */}
            <div className="flex-1 min-w-[180px]">
              <label className="label text-xs">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Nama admin / deskripsi..."
                  className="input pl-9 py-2 text-sm"
                />
              </div>
            </div>

            {/* Filter admin */}
            <div className="min-w-[160px]">
              <label className="label text-xs">Admin</label>
              <select
                value={filterAdmin}
                onChange={e => setFilterAdmin(e.target.value)}
                className="input py-2 text-sm"
              >
                <option value="">Semua Admin</option>
                {admins.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
            </div>

            {/* Filter aksi */}
            <div className="min-w-[160px]">
              <label className="label text-xs">Aksi</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="input py-2 text-sm"
              >
                <option value="">Semua Aksi</option>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Tanggal mulai */}
            <div>
              <label className="label text-xs">Dari</label>
              <input
                type="date"
                value={filterStart}
                onChange={e => setFilterStart(e.target.value)}
                className="input py-2 text-sm"
              />
            </div>

            {/* Tanggal akhir */}
            <div>
              <label className="label text-xs">Sampai</label>
              <input
                type="date"
                value={filterEnd}
                onChange={e => setFilterEnd(e.target.value)}
                className="input py-2 text-sm"
              />
            </div>

            {hasFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition border border-red-200"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Log Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={8} /></div>
          ) : displayedLogs.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada log aktivitas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-44">Waktu</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-36">Admin</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-36">Aksi</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Deskripsi</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-32">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedLogs.map((log, i) => {
                    const cfg  = ACTION_CONFIG[log.action] || DEFAULT_CONFIG
                    const Icon = cfg.icon
                    const meta = log.metadata || {}
                    return (
                      <tr
                        key={log.id}
                        className={clsx(
                          'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                          i % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/30'
                        )}
                      >
                        {/* Waktu */}
                        <td className="py-3 px-4">
                          <p className="text-gray-700 dark:text-gray-200 font-medium text-xs">
                            {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </td>

                        {/* Admin */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">
                                {log.admin_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <span className="font-medium text-gray-800 text-xs truncate max-w-[90px]">
                              {log.admin_name}
                            </span>
                          </div>
                        </td>

                        {/* Aksi badge */}
                        <td className="py-3 px-4">
                          <span className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
                            cfg.color === 'green'  && 'bg-emerald-50 text-emerald-700',
                            cfg.color === 'gray' && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                            cfg.color === 'blue'   && 'bg-blue-50 text-blue-700',
                            cfg.color === 'yellow' && 'bg-amber-50 text-amber-700',
                            cfg.color === 'teal'   && 'bg-teal-50 text-teal-700',
                            cfg.color === 'purple' && 'bg-purple-50 text-purple-700',
                            cfg.color === 'red'    && 'bg-red-50 text-red-700',
                            cfg.color === 'indigo' && 'bg-indigo-50 text-indigo-700',
                            cfg.color === 'orange' && 'bg-orange-50 text-orange-700',
                          )}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Deskripsi */}
                        <td className="py-3 px-4">
                          <p className="text-gray-700 dark:text-gray-200 text-xs">{log.description}</p>
                        </td>

                        {/* Metadata detail */}
                        <td className="py-3 px-4">
                          {Object.keys(meta).length > 0 && (
                            <MetaChips meta={meta} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Halaman {page} dari {totalPages} · {total} total log
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 dark:text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={clsx(
                        'w-8 h-8 rounded-lg text-xs font-medium border transition',
                        p === page
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 dark:text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info superadmin */}
        {!isSuperAdmin && (
          <div className="card bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">
              Halaman ini hanya dapat diakses oleh <strong>Superadmin</strong>. Log aktivitasmu tetap dicatat secara otomatis.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// ── Komponen kecil untuk metadata ───────────────────────────
function MetaChips({ meta }) {
  const chips = []

  if (meta.voucherCount)    chips.push(`${meta.voucherCount} voucher`)
  if (meta.totalAmount)     chips.push(`Rp ${Number(meta.totalAmount).toLocaleString('id-ID')}`)
  if (meta.paymentMethod)   chips.push(meta.paymentMethod === 'cash' ? 'Cash' : 'Hutang')
  if (meta.customerName)    chips.push(meta.customerName)
  if (meta.adminName)       chips.push(meta.adminName)
  if (meta.role)            chips.push(meta.role)
  if (meta.packageCount)    chips.push(`${meta.packageCount} paket`)

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} className="text-[10px] bg-gray-100 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md">
          {c}
        </span>
      ))}
    </div>
  )
}

LogsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(LogsPage)