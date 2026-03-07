import Head from 'next/head'
import { useState, useEffect } from 'react'
import {
  Archive, BookOpen, TrendingUp, DollarSign, ShoppingBag,
  Users, ChevronRight, X, AlertTriangle, CheckCircle,
  RefreshCw, Calendar, Wallet, CreditCard, Package
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import { TableSkeleton } from '../components/ui/Skeleton'
import StatCard from '../components/cards/StatCard'
import Badge from '../components/ui/Badge'
import { getArchives, getArchiveDetail, previewClosingData, executeClosing } from '../services/archiveService'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDateTime, formatDate } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import clsx from 'clsx'

function ArchivesPage() {
  const [archives, setArchives]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [detailId, setDetailId]     = useState(null)
  const [showClosing, setShowClosing] = useState(false)
  const { isSuperAdmin, admin }     = useAuth()
  const { addToast }                = useNotifications()

  useEffect(() => { loadArchives() }, [])

  async function loadArchives() {
    setLoading(true)
    try {
      const data = await getArchives()
      setArchives(data)
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal memuat arsip', message: err.message })
    } finally { setLoading(false) }
  }

  return (
    <>
      <Head><title>Arsip Bulanan — WiFi Voucher Manager</title></Head>

      <div className="max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Arsip Bulanan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Rekap hasil penjualan per periode</p>
          </div>
          {isSuperAdmin && (
            <button onClick={() => setShowClosing(true)} className="btn btn-primary">
              <BookOpen className="w-4 h-4" /> Tutup Buku
            </button>
          )}
        </div>

        {/* List arsip */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse h-24" />
            ))}
          </div>
        ) : archives.length === 0 ? (
          <div className="card py-16 text-center text-gray-400">
            <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada arsip</p>
            <p className="text-xs mt-1">Lakukan tutup buku untuk membuat arsip pertama</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archives.map(arc => (
              <button key={arc.id} onClick={() => setDetailId(arc.id)}
                className="card card-hover w-full text-left transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0">
                      <Archive className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-base">{arc.period_label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(arc.period_start)} — {formatDate(arc.period_end)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Ditutup oleh {arc.admins?.full_name || '-'} · {formatDateTime(arc.closed_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Uang Masuk</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(arc.total_revenue, { compact: true })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Profit</p>
                      <p className="font-bold text-primary-600">{formatCurrency(arc.total_profit, { compact: true })}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailId && (
        <ArchiveDetailModal
          archiveId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Tutup Buku Modal */}
      {showClosing && (
        <ClosingModal
          admin={admin}
          onClose={() => setShowClosing(false)}
          onSuccess={() => {
            setShowClosing(false)
            addToast({ type: 'success', title: 'Tutup buku berhasil!' })
            loadArchives()
          }}
        />
      )}
    </>
  )
}

// ── Archive Detail Modal ─────────────────────────────────────
function ArchiveDetailModal({ archiveId, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('summary')

  useEffect(() => {
    getArchiveDetail(archiveId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [archiveId])

  const arc = data?.archive

  return (
    <Modal isOpen onClose={onClose} title={arc ? `Arsip: ${arc.period_label}` : 'Detail Arsip'} size="3xl">
      {loading ? (
        <div className="py-8"><TableSkeleton rows={4} cols={4} /></div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-8">Gagal memuat data</p>
      ) : (
        <div className="space-y-5">
          {/* Period info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex flex-wrap gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Periode: <strong className="text-gray-800">{formatDate(arc.period_start)} — {formatDate(arc.period_end)}</strong></span>
            <span className="text-gray-500 dark:text-gray-400">Ditutup: <strong className="text-gray-800">{formatDateTime(arc.closed_at)}</strong></span>
            <span className="text-gray-500 dark:text-gray-400">Oleh: <strong className="text-gray-800">{arc.admins?.full_name || '-'}</strong></span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            {[{ key: 'summary', label: 'Ringkasan' }, { key: 'admins', label: 'Performa Admin' }, { key: 'vouchers', label: 'Voucher Terjual' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  tab === t.key ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Summary tab */}
          {tab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Total Uang Masuk" value={formatCurrency(arc.total_revenue, { compact: true })} icon={Wallet} color="green" />
                <StatCard title="Total Profit" value={formatCurrency(arc.total_profit, { compact: true })} icon={TrendingUp} color="purple" />
                <StatCard title="Transaksi" value={arc.total_transactions} subtitle="penjualan" icon={ShoppingBag} color="blue" />
                <StatCard title="Voucher Terjual" value={arc.total_vouchers_sold} subtitle="voucher" icon={Package} color="amber" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendapatan Cash</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatCurrency(arc.cash_revenue)}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hutang yang Dilunasi</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(arc.debt_paid_revenue)}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sisa Hutang Aktif</p>
                  <p className="text-2xl font-bold text-amber-700">{formatCurrency(arc.total_new_debt)}</p>
                  <p className="text-xs text-gray-400 mt-1">dibawa ke periode berikutnya</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin performance tab */}
          {tab === 'admins' && (
            <div>
              {data.adminPerf.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Tidak ada data performa admin</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Admin</th>
                        <th>Transaksi</th>
                        <th>Total Revenue</th>
                        <th>Cash</th>
                        <th>Hutang</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.adminPerf.map((a, i) => (
                        <tr key={a.id}>
                          <td className="text-gray-400 text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</td>
                          <td className="font-semibold text-gray-900 dark:text-white">{a.admin_name}</td>
                          <td>{a.total_sales}</td>
                          <td className="font-semibold text-primary-600">{formatCurrency(a.total_revenue)}</td>
                          <td className="text-emerald-600">{formatCurrency(a.cash_revenue)}</td>
                          <td className="text-amber-600">{formatCurrency(a.debt_revenue)}</td>
                          <td className="text-purple-600 font-semibold">{formatCurrency(a.total_profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Voucher details tab */}
          {tab === 'vouchers' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">{data.saleDetails.length} voucher terjual</p>
              {data.saleDetails.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Tidak ada data voucher</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="table text-xs">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/90 z-10">
                        <tr>
                          <th className="whitespace-nowrap">Kode</th>
                          <th className="whitespace-nowrap">Paket</th>
                          <th className="whitespace-nowrap">Harga</th>
                          <th className="whitespace-nowrap">Profit</th>
                          <th className="whitespace-nowrap">Pelanggan</th>
                          <th className="whitespace-nowrap">Bayar</th>
                          <th className="whitespace-nowrap">Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.saleDetails.map(d => (
                          <tr key={d.id}>
                            <td className="font-mono font-bold text-primary-700 whitespace-nowrap">{d.voucher_code}</td>
                            <td className="whitespace-nowrap">{d.package_name}</td>
                            <td className="whitespace-nowrap">{formatCurrency(d.price)}</td>
                            <td className="text-purple-600 font-semibold whitespace-nowrap">{formatCurrency(d.profit)}</td>
                            <td className="whitespace-nowrap">{d.customer_name || '-'}</td>
                            <td className="whitespace-nowrap">
                              <Badge variant={d.payment_method === 'cash' ? 'green' : 'yellow'}>
                                {d.payment_method === 'cash' ? 'Cash' : 'Hutang'}
                              </Badge>
                            </td>
                            <td className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{d.admin_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Closing Modal ────────────────────────────────────────────
function ClosingModal({ admin, onClose, onSuccess }) {
  const [step, setStep]               = useState(1) // 1: form, 2: preview, 3: confirm
  const [periodLabel, setPeriodLabel] = useState('')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [preview, setPreview]         = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [executing, setExecuting]     = useState(false)
  const [errors, setErrors]           = useState({})

  function validate() {
    const errs = {}
    if (!periodLabel.trim()) errs.label = 'Label periode wajib diisi'
    if (!startDate) errs.start = 'Tanggal mulai wajib diisi'
    if (!endDate) errs.end = 'Tanggal selesai wajib diisi'
    if (startDate && endDate && startDate > endDate) errs.end = 'Tanggal selesai harus setelah tanggal mulai'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handlePreview() {
    if (!validate()) return
    setLoadingPreview(true)
    try {
      const start = new Date(startDate).toISOString()
      const end   = new Date(endDate + 'T23:59:59').toISOString()
      const data  = await previewClosingData({ startDate: start, endDate: end })
      setPreview(data)
      setStep(2)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally { setLoadingPreview(false) }
  }

  async function handleExecute() {
    setExecuting(true)
    try {
      const start = new Date(startDate).toISOString()
      const end   = new Date(endDate + 'T23:59:59').toISOString()
      await executeClosing({
        periodLabel: periodLabel.trim(),
        startDate: start,
        endDate: end,
        closedBy: admin.id,
        preview,
      })
      onSuccess()
    } catch (err) {
      setErrors({ submit: err.message })
      setStep(2)
    } finally { setExecuting(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Tutup Buku" size="lg"
      footer={
        step === 1 ? (
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-secondary flex-1">Batal</button>
            <button onClick={handlePreview} disabled={loadingPreview} className="btn btn-primary flex-1">
              {loadingPreview
                ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Memuat...</span>
                : 'Lihat Preview →'}
            </button>
          </div>
        ) : step === 2 ? (
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn btn-secondary" disabled={executing}>← Ubah Periode</button>
            <button onClick={() => setStep(3)} className="btn btn-primary flex-1" disabled={executing}>
              Konfirmasi Tutup Buku
            </button>
          </div>
        ) : null
      }
    >
      {/* Error banner */}
      {errors.submit && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {errors.submit}
        </div>
      )}

      {/* Step 1: Form */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Perhatian</p>
              <p className="text-xs mt-0.5">Data penjualan dan hutang lunas dalam periode akan <strong>dihapus permanen</strong> setelah diarsipkan. Tindakan ini tidak bisa dibatalkan.</p>
            </div>
          </div>

          <div>
            <label className="label">Label Periode <span className="text-red-500">*</span></label>
            <input className={clsx('input', errors.label && 'input-error')} value={periodLabel}
              onChange={e => { setPeriodLabel(e.target.value); setErrors(p => ({ ...p, label: '' })) }}
              placeholder="cth: Maret 2026" />
            {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dari Tanggal <span className="text-red-500">*</span></label>
              <input type="date" className={clsx('input', errors.start && 'input-error')} value={startDate}
                onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, start: '' })) }} />
              {errors.start && <p className="text-xs text-red-600 mt-1">{errors.start}</p>}
            </div>
            <div>
              <label className="label">Sampai Tanggal <span className="text-red-500">*</span></label>
              <input type="date" className={clsx('input', errors.end && 'input-error')} value={endDate}
                onChange={e => { setEndDate(e.target.value); setErrors(p => ({ ...p, end: '' })) }} />
              {errors.end && <p className="text-xs text-red-600 mt-1">{errors.end}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Preview: {periodLabel}</p>
              <p className="text-xs mt-0.5">{formatDate(startDate)} — {formatDate(endDate)}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Uang Masuk', value: formatCurrency(preview.totalRevenue, { compact: true }), color: 'text-emerald-600' },
              { label: 'Profit', value: formatCurrency(preview.totalProfit, { compact: true }), color: 'text-primary-600' },
              { label: 'Transaksi', value: preview.totalTransactions, color: 'text-gray-800' },
              { label: 'Voucher Terjual', value: preview.totalVouchersSold, color: 'text-gray-800' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={clsx('text-xl font-bold mt-1', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Rincian keuangan */}
          <div className="space-y-2 text-sm">
            {[
              { label: 'Pendapatan Cash', value: preview.cashRevenue, color: 'text-emerald-600' },
              { label: 'Hutang yang Dilunasi', value: preview.debtPaidRevenue, color: 'text-blue-600' },
              { label: 'Sisa Hutang Aktif (dibawa ke depan)', value: preview.totalNewDebt, color: 'text-amber-600' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-gray-600 dark:text-gray-300">{r.label}</span>
                <span className={clsx('font-semibold', r.color)}>{formatCurrency(r.value)}</span>
              </div>
            ))}
          </div>

          {/* Yang akan dihapus */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
            <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Yang akan dihapus setelah arsip:</p>
            <p>• {preview.salesCount} transaksi penjualan + detail item</p>
            <p>• {preview.paidDebtsCount} data hutang yang sudah lunas</p>
            <p className="text-emerald-700 font-medium mt-1">• {preview.activeDebtsCount} hutang aktif → tetap ada</p>
          </div>

          {/* Performa admin preview */}
          {preview.adminPerformance.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Performa Admin</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="table text-xs">
                  <thead><tr><th>Admin</th><th>Transaksi</th><th>Revenue</th><th>Profit</th></tr></thead>
                  <tbody>
                    {preview.adminPerformance.map(a => (
                      <tr key={a.admin_id}>
                        <td className="font-semibold">{a.admin_name}</td>
                        <td>{a.total_sales}</td>
                        <td className="text-primary-600">{formatCurrency(a.total_revenue, { compact: true })}</td>
                        <td className="text-purple-600">{formatCurrency(a.total_profit, { compact: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Final confirm */}
      {step === 3 && (
        <ConfirmClosingStep
          periodLabel={periodLabel}
          executing={executing}
          onBack={() => setStep(2)}
          onConfirm={handleExecute}
        />
      )}
    </Modal>
  )
}

function ConfirmClosingStep({ periodLabel, executing, onBack, onConfirm }) {
  const [typed, setTyped] = useState('')
  const confirmed = typed === periodLabel

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        <p className="font-bold text-base mb-2">⚠️ Konfirmasi Akhir</p>
        <p>Anda akan menutup buku untuk periode <strong>"{periodLabel}"</strong>.</p>
        <p className="mt-1">Data penjualan dan hutang lunas akan <strong>dihapus permanen</strong> setelah diarsipkan.</p>
      </div>

      <div>
        <label className="label">Ketik <strong className="text-red-600">"{periodLabel}"</strong> untuk konfirmasi</label>
        <input className="input" value={typed} onChange={e => setTyped(e.target.value)}
          placeholder={`Ketik: ${periodLabel}`} />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} disabled={executing} className="btn btn-secondary flex-1">← Kembali</button>
        <button onClick={onConfirm} disabled={!confirmed || executing}
          className="btn btn-primary flex-1 disabled:opacity-40">
          {executing
            ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Memproses...</span>
            : '✓ Tutup Buku Sekarang'}
        </button>
      </div>
    </div>
  )
}

ArchivesPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(ArchivesPage)