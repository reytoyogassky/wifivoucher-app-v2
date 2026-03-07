import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Search, X, Check, Phone, User, CreditCard, DollarSign, Download, Plus, Minus, AlertCircle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { getAvailableVouchers } from '../services/voucherService'
import { createSale, getCustomersWithDebt, addToExistingDebt } from '../services/salesService'
import { logActivity, LOG_ACTIONS } from '../services/logService'
import { formatCurrency } from '../utils/formatCurrency'
import { downloadVoucherImage } from '../utils/generateVoucherImage'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import clsx from 'clsx'

function SellPage() {
  const [vouchers, setVouchers] = useState([])
  const [loadingVouchers, setLoadingVouchers] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [form, setForm] = useState({ customerName: '', customerPhone: '', paymentMethod: 'cash', notes: '' })
  const [errors, setErrors] = useState({})
  const [processing, setProcessing] = useState(false)
  const [successSale, setSuccessSale] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [customers, setCustomers] = useState([])
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null) // customer dengan hutang aktif
  const [addToDebt, setAddToDebt] = useState(false) // mode tambah ke hutang existing
  const customerInputRef = useRef()
  const suggestionsRef = useRef()
  const { admin } = useAuth()
  const { addToast } = useNotifications()

  useEffect(() => {
    loadVouchers()
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const data = await getCustomersWithDebt()
      setCustomers(data)
    } catch {}
  }

  async function loadVouchers() {
    setLoadingVouchers(true)
    try {
      const data = await getAvailableVouchers()
      setVouchers(data)
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal memuat voucher', message: err.message })
    } finally {
      setLoadingVouchers(false)
    }
  }

  const filtered = vouchers.filter(v =>
    v.code.toLowerCase().includes(search.toLowerCase()) ||
    v.package_name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(voucher) {
    setSelected(prev =>
      prev.find(v => v.id === voucher.id)
        ? prev.filter(v => v.id !== voucher.id)
        : [...prev, voucher]
    )
  }

  function removeSelected(id) {
    setSelected(prev => prev.filter(v => v.id !== id))
  }

  const totalAmount = selected.reduce((sum, v) => sum + Number(v.price), 0)

  function validate() {
    const errs = {}
    if (!form.customerName.trim()) errs.customerName = 'Nama pelanggan wajib diisi'
    if (selected.length === 0) errs.vouchers = 'Pilih minimal 1 voucher'
    if (form.paymentMethod === 'debt' && !form.customerPhone.trim()) {
      errs.customerPhone = 'Nomor telepon wajib untuk hutang'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setProcessing(true)
    try {
   let result

if (
  form.paymentMethod === 'debt' &&
  selectedCustomer?.activeDebt
) {
  // Tambah ke hutang yang sudah ada
  result = await addToExistingDebt({
    debtId: selectedCustomer.activeDebt.id,
    adminId: admin.id,
    voucherIds: selected.map(v => v.id),
    customerName: form.customerName.trim(),
    customerPhone: form.customerPhone.trim() || null,
    notes: form.notes.trim() || null,
  })
} else {
  result = await createSale({
    adminId: admin.id,
    customerName: form.customerName.trim(),
    customerPhone: form.customerPhone.trim() || null,
    paymentMethod: form.paymentMethod,
    voucherIds: selected.map(v => v.id),
    notes: form.notes.trim() || null,
  })
}

      setSuccessSale({ ...result.sale, vouchers: result.vouchers })

      // Catat log aktivitas
      logActivity({
        adminId:     admin.id,
        adminName:   admin.full_name,
        action:      LOG_ACTIONS.SELL,
        description: `Menjual ${result.vouchers?.length || selected.length} voucher kepada ${form.customerName.trim()}`,
        metadata: {
          voucherCount:  result.vouchers?.length || selected.length,
          totalAmount:   result.sale?.total_amount,
          paymentMethod: form.paymentMethod,
          customerName:  form.customerName.trim(),
        },
      })
      setSelected([])
      setForm({ customerName: '', customerPhone: '', paymentMethod: 'cash', notes: '' })
      setSelectedCustomer(null)
      setAddToDebt(false)
      loadVouchers()
      loadCustomers()
    } catch (err) {
      addToast({ type: 'error', title: 'Transaksi gagal', message: err.message })
    } finally {
      setProcessing(false)
    }
  }

  async function handleDownload() {
    if (!successSale) return
    setDownloading(true)
    try {
      await downloadVoucherImage(successSale, successSale.vouchers)
      addToast({ type: 'success', title: 'Kartu voucher diunduh!' })
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal unduh', message: err.message })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Head><title>Jual Voucher — WiFi Voucher Manager</title></Head>

      <div className="max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Voucher list */}
          <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Pilih Voucher</h2>
                <span className="text-xs text-gray-400">{filtered.length} tersedia</span>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama paket..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {errors.vouchers && (
                <div className="mb-3 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.vouchers}
                </div>
              )}

              {/* Voucher Grid */}
              <div className="grid sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {loadingVouchers ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-gray-400">
                    <p className="text-sm">Tidak ada voucher tersedia</p>
                  </div>
                ) : (
                  filtered.map(voucher => (
                    <VoucherCard
                      key={voucher.id}
                      voucher={voucher}
                      selected={!!selected.find(v => v.id === voucher.id)}
                      onToggle={() => toggleSelect(voucher)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Order form */}
          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
            {/* Selected vouchers */}
            {selected.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  Dipilih ({selected.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.map(v => (
                    <div key={v.id} className="flex items-center justify-between bg-primary-50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-xs font-mono font-bold text-primary-700">{v.code}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{v.package_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary-600">{formatCurrency(v.price)}</span>
                        <button onClick={() => removeSelected(v.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</span>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="card">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Detail Transaksi</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Nama Pelanggan <span className="text-red-500">*</span></label>
                  <div className="relative" ref={customerInputRef}>
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={e => {
                        const val = e.target.value
                        setForm(p => ({ ...p, customerName: val }))
                        setErrors(p => ({ ...p, customerName: '' }))
                        setAddToDebt(false)
                        setSelectedCustomer(null)
                        if (val.trim().length > 0) {
                          const filtered = customers.filter(c =>
                            c.name.toLowerCase().includes(val.toLowerCase())
                          )
                          setCustomerSuggestions(filtered)
                          setShowSuggestions(filtered.length > 0)
                        } else {
                          setShowSuggestions(false)
                        }
                      }}
                      onFocus={() => {
                        if (form.customerName.trim().length === 0 && customers.length > 0) {
                          setCustomerSuggestions(customers.slice(0, 8))
                          setShowSuggestions(true)
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      placeholder="Ketik atau pilih nama pelanggan"
                      autoComplete="off"
                      className={clsx('input pl-10', errors.customerName && 'input-error')}
                    />
                    {/* Dropdown suggestions */}
                    {showSuggestions && customerSuggestions.length > 0 && (
                      <div ref={suggestionsRef} className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-52 overflow-y-auto">
                        {customerSuggestions.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => {
  setForm(p => ({
    ...p,
    customerName: c.name,
    customerPhone: c.phone || p.customerPhone,
    paymentMethod: c.activeDebt ? 'debt' : p.paymentMethod
  }))

  setSelectedCustomer(c)
  setShowSuggestions(false)
  setErrors(p => ({ ...p, customerName: '' }))

  if (c.activeDebt) {
    setAddToDebt(true)
  }
}}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                              </div>
                            </div>
                            {c.activeDebt && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                Hutang {formatCurrency(c.activeDebt.remaining)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.customerName && <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>}

                  {/* Info hutang aktif + toggle tambah ke hutang */}
                  {selectedCustomer?.activeDebt && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start justify-between gap-2">
<div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
  <p className="text-xs font-semibold text-amber-800">
    ⚠️ Pelanggan ini memiliki hutang aktif
  </p>

  <p className="text-xs text-amber-700 mt-1">
    Sisa hutang:
    <span className="font-bold">
      {formatCurrency(selectedCustomer.activeDebt.remaining)}
    </span>
  </p>

  <p className="text-xs text-amber-700 mt-1">
    Voucher yang dibeli otomatis ditambahkan ke hutang ini.
  </p>
</div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">
                    Nomor Telepon
                    {form.paymentMethod === 'debt' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={form.customerPhone}
                      onChange={e => { setForm(p => ({ ...p, customerPhone: e.target.value })); setErrors(p => ({ ...p, customerPhone: '' })) }}
                      placeholder="08xxxxxxxxxx"
                      className={clsx('input pl-10', errors.customerPhone && 'input-error')}
                    />
                  </div>
                  {errors.customerPhone && <p className="text-xs text-red-600 mt-1">{errors.customerPhone}</p>}
                </div>

                {/* Payment method */}
                <div>
                  <label className="label">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'cash', label: 'Cash', icon: DollarSign, color: 'emerald' },
                      { value: 'debt', label: 'Hutang', icon: CreditCard, color: 'amber' },
                    ].map(method => {
                      const Icon = method.icon
                      const active = form.paymentMethod === method.value
                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, paymentMethod: method.value }))}
                          className={clsx(
                            'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                            active
                              ? method.color === 'emerald'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {method.label}
                          {active && <Check className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Total */}
                {selected.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{selected.length} voucher</span>
                    <span className="text-xl font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing || selected.length === 0}
                  className="btn-primary btn w-full btn-lg"
                >
                  {processing ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4" />Proses Transaksi</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={!!successSale}
        onClose={() => setSuccessSale(null)}
        title="Transaksi Berhasil! 🎉"
        size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setSuccessSale(null)} className="btn-secondary btn flex-1">
              Tutup
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary btn flex-1"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Mengunduh...' : 'Unduh Kartu'}
            </button>
          </div>
        }
      >
        {successSale && <SaleSuccessContent sale={successSale} />}
      </Modal>
    </>
  )
}

function VoucherCard({ voucher, selected, onToggle }) {
  return (
    <button
      onClick={onToggle}
      type="button"
      className={clsx(
        'w-full text-left p-4 rounded-xl border-2 transition-all duration-150',
        selected
          ? 'border-primary-500 bg-primary-50 shadow-glow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={clsx(
          'text-xs font-mono font-bold px-2 py-0.5 rounded-md',
          selected ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        )}>
          {voucher.code}
        </span>
        <div className={clsx(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
        )}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{voucher.package_name}</p>
      <p className="text-xs text-gray-400 mb-2">{voucher.duration} · {voucher.speed || '-'}</p>
      <p className="text-base font-bold text-primary-600">{formatCurrency(voucher.price)}</p>
    </button>
  )
}

function SaleSuccessContent({ sale }) {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 rounded-xl p-4 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <Check className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="font-bold text-emerald-800">{sale.customer_name}</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(sale.total_amount)}</p>
        <Badge variant={sale.payment_method === 'cash' ? 'green' : 'yellow'} className="mt-2">
          {sale.payment_method === 'cash' ? '✓ Cash' : '⏳ Hutang'}
        </Badge>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Voucher ({sale.vouchers?.length})</p>
        <div className="space-y-2">
          {sale.vouchers?.map(v => (
            <div key={v.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <div>
                <span className="text-xs font-mono font-bold text-primary-700">{v.code}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{v.package_name}</span>
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(v.price)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Klik "Unduh Kartu" untuk menyimpan kartu voucher sebagai gambar
      </p>
    </div>
  )
}

SellPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(SellPage)