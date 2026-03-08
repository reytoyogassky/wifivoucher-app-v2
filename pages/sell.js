import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, Search, X, Check, Phone, User, CreditCard, DollarSign,
  Download, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp,
  Users, ArrowRight, CheckCircle, Loader2, Ticket, Wifi,
} from 'lucide-react'
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

function makeSlot() {
  return {
    _id:              Date.now() + Math.random(),
    customerName:     '',
    customerPhone:    '',
    paymentMethod:    'cash',
    notes:            '',
    vouchers:         [],
    expanded:         true,
    selectedCustomer: null,
    errors:           {},
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SellPage() {
  const [allVouchers, setAllVouchers]         = useState([])
  const [loadingVouchers, setLoadingVouchers] = useState(true)
  const [dbCustomers, setDbCustomers]         = useState([])
  const [queue, setQueue]                     = useState([makeSlot()])
  const [search, setSearch]                   = useState('')
  const [activeIdx, setActiveIdx]             = useState(0)
  const [processing, setProcessing]           = useState(false)
  const [results, setResults]                 = useState([])
  const [showResults, setShowResults]         = useState(false)
  const [downloading, setDownloading]         = useState(null)
  // Mobile tab: 'vouchers' | 'customers'
  const [mobileTab, setMobileTab]             = useState('vouchers')
  // Mobile voucher bottom sheet open
  const [showVoucherSheet, setShowVoucherSheet] = useState(false)

  const { admin }    = useAuth()
  const { addToast } = useNotifications()

  useEffect(() => { loadVouchers(); loadDbCustomers() }, [])

  async function loadDbCustomers() {
    try { setDbCustomers(await getCustomersWithDebt()) } catch {}
  }

  async function loadVouchers() {
    setLoadingVouchers(true)
    try { setAllVouchers(await getAvailableVouchers()) }
    catch (err) { addToast({ type: 'error', title: 'Gagal memuat voucher', message: err.message }) }
    finally { setLoadingVouchers(false) }
  }

  const usedIds  = new Set(queue.flatMap(c => c.vouchers.map(v => v.id)))
  const filtered = allVouchers.filter(v =>
    !usedIds.has(v.id) &&
    (v.code.toLowerCase().includes(search.toLowerCase()) ||
     v.package_name.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Queue mutations ───────────────────────────────────────────────────────

  function addSlot() {
    const s = makeSlot()
    setQueue(p => [...p, s])
    setActiveIdx(queue.length)
  }

  function removeSlot(idx) {
    setQueue(p => p.filter((_, i) => i !== idx))
    setActiveIdx(p => Math.max(0, Math.min(p, queue.length - 2)))
  }

  function patchSlot(idx, patch) {
    setQueue(p => p.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  function addVoucherToActive(v) {
    setQueue(p => p.map((c, i) =>
      i === activeIdx
        ? { ...c, vouchers: [...c.vouchers, v], errors: { ...c.errors, vouchers: '' } }
        : c
    ))
  }

  function removeVoucher(cIdx, vid) {
    setQueue(p => p.map((c, i) => i === cIdx ? { ...c, vouchers: c.vouchers.filter(v => v.id !== vid) } : c))
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  function validate() {
    let ok = true
    setQueue(p => p.map(c => {
      const e = {}
      if (!c.customerName.trim())   e.customerName = 'Nama wajib diisi'
      if (!c.vouchers.length)       e.vouchers     = 'Pilih minimal 1 voucher'
      if (c.paymentMethod === 'debt' && !c.customerPhone.trim()) e.customerPhone = 'No. HP wajib untuk hutang'
      if (Object.keys(e).length) ok = false
      return { ...c, errors: e, expanded: Object.keys(e).length ? true : c.expanded }
    }))
    return ok
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) {
      addToast({ type: 'error', title: 'Ada data yang belum lengkap' })
      return
    }
    setProcessing(true)
    const res = []
    for (const c of queue) {
      try {
        let r
        if (c.paymentMethod === 'debt' && c.selectedCustomer?.activeDebt) {
          r = await addToExistingDebt({ debtId: c.selectedCustomer.activeDebt.id, adminId: admin.id, voucherIds: c.vouchers.map(v => v.id), customerName: c.customerName.trim(), customerPhone: c.customerPhone.trim() || null, notes: c.notes.trim() || null })
        } else {
          r = await createSale({ adminId: admin.id, customerName: c.customerName.trim(), customerPhone: c.customerPhone.trim() || null, paymentMethod: c.paymentMethod, voucherIds: c.vouchers.map(v => v.id), notes: c.notes.trim() || null })
        }
        logActivity({ adminId: admin.id, adminName: admin.full_name, action: LOG_ACTIONS.SELL, description: `Menjual ${r.vouchers?.length} voucher kepada ${c.customerName.trim()}`, metadata: { voucherCount: r.vouchers?.length, totalAmount: r.sale?.total_amount, paymentMethod: c.paymentMethod, customerName: c.customerName.trim() } })
        res.push({ slot: c, sale: r.sale, vouchers: r.vouchers, success: true })
      } catch (err) {
        res.push({ slot: c, error: err.message, success: false })
      }
    }
    setProcessing(false)
    setResults(res)
    setShowResults(true)
    const ok   = res.filter(r => r.success).length
    const fail = res.length - ok
    if (!fail) addToast({ type: 'success', title: `${ok} transaksi berhasil!` })
    else       addToast({ type: 'error',   title: `${ok} berhasil, ${fail} gagal` })
    setQueue([makeSlot()])
    setActiveIdx(0)
    loadVouchers()
    loadDbCustomers()
  }

  async function handleDownload(r) {
    setDownloading(r.slot._id)
    try { await downloadVoucherImage(r.sale, r.vouchers); addToast({ type: 'success', title: 'Kartu voucher diunduh!' }) }
    catch (err) { addToast({ type: 'error', title: 'Gagal unduh', message: err.message }) }
    finally { setDownloading(null) }
  }

  const grandTotal    = queue.reduce((s, c) => s + c.vouchers.reduce((vs, v) => vs + Number(v.price), 0), 0)
  const totalVouchers = queue.reduce((s, c) => s + c.vouchers.length, 0)
  const activeSlot    = queue[activeIdx]

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head><title>Jual Voucher — WiFi Voucher Manager</title></Head>

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT (lg+)
      ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:block max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-5">

          {/* LEFT: Voucher picker */}
          <div className="lg:col-span-3">
            <div className="card h-full">
              <VoucherPickerPanel
                activeSlot={activeSlot}
                activeIdx={activeIdx}
                queue={queue}
                filtered={filtered}
                loadingVouchers={loadingVouchers}
                allVouchers={allVouchers}
                search={search}
                setSearch={setSearch}
                setActiveIdx={setActiveIdx}
                addVoucherToActive={addVoucherToActive}
              />
            </div>
          </div>

          {/* RIGHT: Customer queue */}
          <div className="lg:col-span-2 space-y-3">
            <CustomerQueuePanel
              queue={queue}
              activeIdx={activeIdx}
              dbCustomers={dbCustomers}
              grandTotal={grandTotal}
              totalVouchers={totalVouchers}
              processing={processing}
              onFocus={setActiveIdx}
              onPatch={patchSlot}
              onDelete={removeSlot}
              onRemoveVoucher={removeVoucher}
              onAddSlot={addSlot}
              onSubmit={handleSubmit}
              onPickVouchers={() => {}}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
      ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* ── Customer form(s) ── */}
        <div className="space-y-3 mb-4">

          {queue.map((c, idx) => (
            <MobileCustomerCard
              key={c._id}
              slot={c} idx={idx}
              isActive={activeIdx === idx}
              canDelete={queue.length > 1}
              dbCustomers={dbCustomers}
              onFocus={() => setActiveIdx(idx)}
              onPatch={patch => patchSlot(idx, patch)}
              onDelete={() => removeSlot(idx)}
              onRemoveVoucher={vid => removeVoucher(idx, vid)}
              onPickVouchers={() => { setActiveIdx(idx); setShowVoucherSheet(true) }}
            />
          ))}

          {/* Tambah pelanggan — di bawah kartu */}
          <button
            type="button"
            onClick={addSlot}
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold text-sm hover:border-primary-400 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 active:scale-[0.98] transition-all touch-manipulation"
          >
            <Plus className="w-5 h-5" />
            Tambah Pelanggan
          </button>
        </div>

        {/* ── Submit bar ── */}
        {totalVouchers > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-28">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400">{queue.length} pelanggan · {totalVouchers} voucher</p>
                <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary-500 dark:text-primary-400" />
              </div>
            </div>
            <button type="button" onClick={handleSubmit} disabled={processing}
              className="w-full btn-primary btn h-14 text-base font-bold rounded-2xl active:scale-[0.98] transition-transform touch-manipulation">
              {processing
                ? <><Loader2 className="w-5 h-5 animate-spin" />Memproses...</>
                : <><ShoppingCart className="w-5 h-5" />{queue.length === 1 ? 'Proses Transaksi' : `Proses ${queue.length} Transaksi`}</>
              }
            </button>
          </div>
        )}

        {/* ── Voucher Bottom Sheet ── */}
        <VoucherBottomSheet
          isOpen={showVoucherSheet}
          onClose={() => setShowVoucherSheet(false)}
          activeSlot={activeSlot}
          activeIdx={activeIdx}
          queue={queue}
          filtered={filtered}
          loadingVouchers={loadingVouchers}
          allVouchers={allVouchers}
          search={search}
          setSearch={setSearch}
          setActiveIdx={setActiveIdx}
          addVoucherToActive={addVoucherToActive}
          totalVouchers={totalVouchers}
        />
      </div>

      {/* ── Results Modal ── */}
      <Modal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        title="Hasil Transaksi 🎉"
        size="md"
        footer={
          <button onClick={() => setShowResults(false)} className="btn-primary btn w-full h-12 text-base active:scale-[0.98] touch-manipulation">
            Selesai
          </button>
        }
      >
        <ResultsList results={results} downloading={downloading} onDownload={handleDownload} />
      </Modal>
    </>
  )
}

// ─── VoucherPickerPanel (shared between desktop + bottom sheet) ──────────────

function VoucherPickerPanel({ activeSlot, activeIdx, queue, filtered, loadingVouchers, allVouchers, search, setSearch, setActiveIdx, addVoucherToActive, compact = false }) {
  return (
    <div className="space-y-3">
      {/* Active customer badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {activeIdx + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
              {activeSlot?.customerName.trim() || <span className="font-normal text-gray-400">Pelanggan {activeIdx + 1}</span>}
            </p>
            <p className="text-xs text-gray-400">{activeSlot?.vouchers.length || 0} voucher dipilih</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{filtered.length} tersedia</span>
      </div>

      {/* Customer tabs */}
      {queue.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {queue.map((c, i) => (
            <button key={c._id} type="button" onClick={() => setActiveIdx(i)}
              className={clsx(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border touch-manipulation',
                activeIdx === i
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
              )}>
              <span className={clsx('w-4 h-4 rounded-full text-[10px] flex items-center justify-center shrink-0 font-bold', activeIdx === i ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-500')}>
                {i + 1}
              </span>
              <span className="max-w-[68px] truncate">{c.customerName.trim() || `P${i + 1}`}</span>
              {c.vouchers.length > 0 && (
                <span className={clsx('px-1.5 rounded-lg text-[10px] font-bold', activeIdx === i ? 'bg-white/25' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400')}>
                  {c.vouchers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          placeholder="Cari kode atau nama paket..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-10 h-12 text-base"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {activeSlot?.errors?.vouchers && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{activeSlot.errors.vouchers}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {loadingVouchers
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-2">
                <Skeleton className="h-4 w-16" /><Skeleton className="h-5 w-24" /><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-14" />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div className="col-span-2 py-12 text-center">
                <Wifi className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">
                  {allVouchers.length === 0 ? 'Tidak ada voucher tersedia' : 'Tidak ada voucher ditemukan'}
                </p>
              </div>
            )
          : filtered.map(v => <VoucherCard key={v.id} voucher={v} onAdd={() => addVoucherToActive(v)} />)
        }
      </div>
    </div>
  )
}

// ─── CustomerQueuePanel (desktop only) ───────────────────────────────────────

function CustomerQueuePanel({ queue, activeIdx, dbCustomers, grandTotal, totalVouchers, processing, onFocus, onPatch, onDelete, onRemoveVoucher, onAddSlot, onSubmit, onPickVouchers }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {queue.length === 1 ? 'Detail Pelanggan' : `Antrian (${queue.length})`}
          </span>
        </div>
        <button type="button" onClick={onAddSlot}
          className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 rounded-xl border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors">
          <Plus className="w-3.5 h-3.5" />Tambah Pelanggan
        </button>
      </div>

      {queue.map((c, idx) => (
        <DesktopCustomerSlot
          key={c._id} slot={c} idx={idx}
          isActive={activeIdx === idx}
          canDelete={queue.length > 1}
          dbCustomers={dbCustomers}
          onFocus={() => onFocus(idx)}
          onPatch={patch => onPatch(idx, patch)}
          onDelete={() => onDelete(idx)}
          onRemoveVoucher={vid => onRemoveVoucher(idx, vid)}
          onPickVouchers={() => onPickVouchers(idx)}
        />
      ))}

      {totalVouchers > 0 && (
        <div className="card !p-4 border-2 border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-800 dark:text-gray-200">{queue.length}</span> pelanggan &middot;&nbsp;
              <span className="font-bold text-gray-800 dark:text-gray-200">{totalVouchers}</span> voucher
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400">Grand Total</p>
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
          <button type="button" onClick={onSubmit} disabled={processing}
            className="btn-primary btn w-full h-12 text-base font-bold active:scale-[0.98] transition-transform">
            {processing
              ? <><Loader2 className="w-5 h-5 animate-spin" />Memproses...</>
              : <><ShoppingCart className="w-5 h-5" />{queue.length === 1 ? 'Proses Transaksi' : `Proses ${queue.length} Transaksi`}</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─── VoucherBottomSheet (mobile only) ────────────────────────────────────────

function VoucherBottomSheet({ isOpen, onClose, activeSlot, activeIdx, queue, filtered, loadingVouchers, allVouchers, search, setSearch, setActiveIdx, addVoucherToActive, totalVouchers }) {
  const sheetRef = useRef()

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else        document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  function handleAdd(v) {
    addVoucherToActive(v)
    // keep sheet open so user can keep adding
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-white dark:bg-gray-900 rounded-t-3xl flex flex-col"
        style={{ maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Pilih Voucher</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Untuk:&nbsp;
              <span className="text-primary-600 dark:text-primary-400 font-semibold">
                {activeSlot?.customerName.trim() || `Pelanggan ${activeIdx + 1}`}
              </span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-transform touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
          <VoucherPickerPanel
            activeSlot={activeSlot}
            activeIdx={activeIdx}
            queue={queue}
            filtered={filtered}
            loadingVouchers={loadingVouchers}
            allVouchers={allVouchers}
            search={search}
            setSearch={setSearch}
            setActiveIdx={setActiveIdx}
            addVoucherToActive={handleAdd}
            compact
          />
        </div>

        {/* Done button */}
        <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button onClick={onClose}
            className="w-full btn-primary btn h-14 text-base font-bold rounded-2xl active:scale-[0.98] transition-transform touch-manipulation">
            <Check className="w-5 h-5" />
            Selesai{totalVouchers > 0 && ` (${totalVouchers} voucher)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MobileCustomerCard ───────────────────────────────────────────────────────

function MobileCustomerCard({ slot: c, idx, isActive, canDelete, dbCustomers, onFocus, onPatch, onDelete, onRemoveVoucher, onPickVouchers }) {
  const [showSug, setShowSug] = useState(false)
  const [sugs, setSugs]       = useState([])

  const total    = c.vouchers.reduce((s, v) => s + Number(v.price), 0)
  const hasError = Object.keys(c.errors).length > 0

  function onNameChange(val) {
    onPatch({ customerName: val, errors: { ...c.errors, customerName: '' }, selectedCustomer: null })
    const f = val.trim()
      ? dbCustomers.filter(x => x.name.toLowerCase().includes(val.toLowerCase()))
      : dbCustomers.slice(0, 8)
    setSugs(f); setShowSug(f.length > 0)
  }

  function pickSuggestion(s) {
    onPatch({ customerName: s.name, customerPhone: s.phone || c.customerPhone, paymentMethod: s.activeDebt ? 'debt' : c.paymentMethod, selectedCustomer: s, errors: { ...c.errors, customerName: '' } })
    setShowSug(false)
  }

  return (
    <div className={clsx(
      'rounded-2xl border-2 overflow-visible bg-white dark:bg-gray-900 transition-all',
      isActive
        ? 'border-primary-400 dark:border-primary-500'
        : hasError
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700',
    )} onClick={onFocus}>

      {/* Header */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-3.5 rounded-t-2xl cursor-pointer select-none',
        isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-50 dark:bg-gray-800/50',
      )}
        onClick={() => { onFocus(); onPatch({ expanded: !c.expanded }) }}>
        <span className={clsx('w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0', isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
            {c.customerName.trim() || <span className="font-normal text-gray-400">Pelanggan {idx + 1}</span>}
          </p>
          {c.vouchers.length > 0
            ? <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold">{c.vouchers.length} voucher · {formatCurrency(total, { compact: true })}</p>
            : <p className="text-xs text-gray-400">Belum ada voucher</p>
          }
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
          {canDelete && (
            <button type="button" onClick={e => { e.stopPropagation(); onDelete() }}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-90 touch-manipulation">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-7 h-7 flex items-center justify-center text-gray-400">
            {c.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Body */}
      {c.expanded && (
        <div className="px-4 pb-4 pt-4 space-y-4">

          {/* Nama */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Nama Pelanggan <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" value={c.customerName}
                onClick={e => e.stopPropagation()}
                onChange={e => onNameChange(e.target.value)}
                onFocus={() => {
                  setSugs(c.customerName.trim() ? dbCustomers.filter(x => x.name.toLowerCase().includes(c.customerName.toLowerCase())) : dbCustomers.slice(0, 8))
                  setShowSug(true)
                }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Ketik nama pelanggan"
                autoComplete="off"
                inputMode="text"
                className={clsx(
                  'w-full rounded-2xl border-2 bg-gray-50 dark:bg-gray-800 pl-11 pr-4 h-14 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:outline-none focus:bg-white dark:focus:bg-gray-800 transition-colors',
                  c.errors.customerName
                    ? 'border-red-400 dark:border-red-600 focus:border-red-500'
                    : 'border-transparent focus:border-primary-400 dark:focus:border-primary-500',
                )}
              />
            </div>
            {showSug && sugs.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-56 overflow-y-auto">
                {sugs.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0 touch-manipulation">
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.name}</p>
                      {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                    </div>
                    {s.activeDebt && (
                      <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Hutang {formatCurrency(s.activeDebt.remaining, { compact: true })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {c.errors.customerName && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                <AlertCircle className="w-3 h-3" />{c.errors.customerName}
              </p>
            )}
          </div>

          {/* No HP */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Nomor HP {c.paymentMethod === 'debt' && <span className="text-red-400">*</span>}
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="tel" value={c.customerPhone} inputMode="tel"
                onClick={e => e.stopPropagation()}
                onChange={e => onPatch({ customerPhone: e.target.value, errors: { ...c.errors, customerPhone: '' } })}
                placeholder="08xxxxxxxxxx"
                className={clsx(
                  'w-full rounded-2xl border-2 bg-gray-50 dark:bg-gray-800 pl-11 pr-4 h-14 text-base font-medium text-gray-900 dark:text-white placeholder-gray-400',
                  'focus:outline-none focus:bg-white dark:focus:bg-gray-800 transition-colors',
                  c.errors.customerPhone
                    ? 'border-red-400 dark:border-red-600 focus:border-red-500'
                    : 'border-transparent focus:border-primary-400 dark:focus:border-primary-500',
                )}
              />
            </div>
            {c.errors.customerPhone && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
                <AlertCircle className="w-3 h-3" />{c.errors.customerPhone}
              </p>
            )}
          </div>

          {/* Metode bayar — large tap targets */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { value: 'cash', label: 'Cash',   sub: 'Bayar sekarang', icon: DollarSign, ac: 'emerald' },
                { value: 'debt', label: 'Hutang', sub: 'Bayar nanti',    icon: CreditCard, ac: 'amber'   },
              ].map(m => {
                const Icon = m.icon; const active = c.paymentMethod === m.value
                return (
                  <button key={m.value} type="button"
                    onClick={e => { e.stopPropagation(); onPatch({ paymentMethod: m.value }) }}
                    className={clsx(
                      'flex flex-col gap-0.5 p-4 rounded-2xl border-2 transition-all active:scale-95 touch-manipulation text-left',
                      active
                        ? m.ac === 'emerald' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
                    )}>
                    <div className="flex items-center justify-between mb-1">
                      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', active ? (m.ac === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40') : 'bg-gray-200 dark:bg-gray-700')}>
                        <Icon className={clsx('w-4 h-4', active ? (m.ac === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400') : 'text-gray-500 dark:text-gray-400')} />
                      </div>
                      {active && (
                        <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center', m.ac === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500')}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className={clsx('text-sm font-bold', active ? (m.ac === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300') : 'text-gray-700 dark:text-gray-300')}>{m.label}</p>
                    <p className={clsx('text-xs', active ? (m.ac === 'emerald' ? 'text-emerald-600/70 dark:text-emerald-400/60' : 'text-amber-600/70 dark:text-amber-400/60') : 'text-gray-400')}>{m.sub}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hutang info */}
          {c.selectedCustomer?.activeDebt && (
            <div className="flex gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Hutang aktif: {formatCurrency(c.selectedCustomer.activeDebt.remaining)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Voucher baru akan ditambahkan ke hutang ini.</p>
              </div>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Catatan <span className="font-normal text-gray-400">(opsional)</span></label>
            <input type="text" value={c.notes}
              onClick={e => e.stopPropagation()}
              onChange={e => onPatch({ notes: e.target.value })}
              placeholder="Catatan transaksi..."
              className="w-full rounded-2xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 px-4 h-14 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-400 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 transition-colors"
            />
          </div>

          {/* Voucher area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Voucher Dipilih</label>
              {c.errors.vouchers && (
                <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{c.errors.vouchers}</p>
              )}
            </div>

            {c.vouchers.length > 0 ? (
              <div className="space-y-2">
                {c.vouchers.map(v => (
                  <div key={v.id} className="flex items-center gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-2xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-bold text-primary-700 dark:text-primary-300">{v.code}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.package_name}</p>
                    </div>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0">{formatCurrency(v.price, { compact: true })}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); onRemoveVoucher(v.id) }}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-90 touch-manipulation shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-base font-bold text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); onPickVouchers() }}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-sm font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 active:scale-[0.98] transition-all touch-manipulation">
                  <Plus className="w-4 h-4" />Tambah voucher lagi
                </button>
              </div>
            ) : (
              <button type="button" onClick={e => { e.stopPropagation(); onPickVouchers() }}
                className={clsx(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] touch-manipulation',
                  c.errors.vouchers ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700',
                )}>
                <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Pilih Voucher</p>
                  <p className="text-xs text-gray-400">Tap untuk buka daftar voucher</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DesktopCustomerSlot (desktop version, compact) ──────────────────────────

function DesktopCustomerSlot({ slot: c, idx, isActive, canDelete, dbCustomers, onFocus, onPatch, onDelete, onRemoveVoucher }) {
  const [showSug, setShowSug] = useState(false)
  const [sugs, setSugs]       = useState([])

  const total    = c.vouchers.reduce((s, v) => s + Number(v.price), 0)
  const hasError = Object.keys(c.errors).length > 0

  function onNameChange(val) {
    onPatch({ customerName: val, errors: { ...c.errors, customerName: '' }, selectedCustomer: null })
    const f = val.trim() ? dbCustomers.filter(x => x.name.toLowerCase().includes(val.toLowerCase())) : dbCustomers.slice(0, 8)
    setSugs(f); setShowSug(f.length > 0)
  }

  function pickSuggestion(s) {
    onPatch({ customerName: s.name, customerPhone: s.phone || c.customerPhone, paymentMethod: s.activeDebt ? 'debt' : c.paymentMethod, selectedCustomer: s, errors: { ...c.errors, customerName: '' } })
    setShowSug(false)
  }

  return (
    <div className={clsx('rounded-2xl border-2 overflow-visible bg-white dark:bg-gray-900 transition-all', isActive ? 'border-primary-400 dark:border-primary-500' : hasError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700')} onClick={onFocus}>
      {/* Header */}
      <div className={clsx('flex items-center gap-2.5 px-3.5 py-2.5 rounded-t-2xl cursor-pointer select-none', isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-50 dark:bg-gray-800/50')}
        onClick={() => { onFocus(); onPatch({ expanded: !c.expanded }) }}>
        <span className={clsx('w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0', isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
            {c.customerName.trim() || <span className="font-normal text-gray-400">Pelanggan {idx + 1}</span>}
          </p>
          {c.vouchers.length > 0 && <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold">{c.vouchers.length}v · {formatCurrency(total, { compact: true })}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasError && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
          {canDelete && (
            <button type="button" onClick={e => { e.stopPropagation(); onDelete() }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="text-gray-400">{c.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
        </div>
      </div>

      {c.expanded && (
        <div className="px-3.5 pb-3.5 pt-3 space-y-2.5 rounded-b-2xl" onClick={onFocus}>
          {/* Nama */}
          <div className="relative">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input type="text" value={c.customerName}
                onClick={e => e.stopPropagation()}
                onChange={e => onNameChange(e.target.value)}
                onFocus={() => { setSugs(c.customerName.trim() ? dbCustomers.filter(x => x.name.toLowerCase().includes(c.customerName.toLowerCase())) : dbCustomers.slice(0, 8)); setShowSug(true) }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Nama pelanggan" autoComplete="off"
                className={clsx('input pl-8 h-10 text-sm', c.errors.customerName && 'input-error')} />
            </div>
            {showSug && sugs.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-48 overflow-y-auto">
                {sugs.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-600 dark:text-primary-400">{s.name.charAt(0).toUpperCase()}</div>
                      <div><p className="text-xs font-semibold text-gray-900 dark:text-white">{s.name}</p>{s.phone && <p className="text-[11px] text-gray-400">{s.phone}</p>}</div>
                    </div>
                    {s.activeDebt && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">Hutang {formatCurrency(s.activeDebt.remaining, { compact: true })}</span>}
                  </button>
                ))}
              </div>
            )}
            {c.errors.customerName && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{c.errors.customerName}</p>}
          </div>

          {/* Phone */}
          <div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input type="tel" value={c.customerPhone}
                onClick={e => e.stopPropagation()}
                onChange={e => onPatch({ customerPhone: e.target.value, errors: { ...c.errors, customerPhone: '' } })}
                placeholder="08xxxxxxxxxx"
                className={clsx('input pl-8 h-10 text-sm', c.errors.customerPhone && 'input-error')} />
            </div>
            {c.errors.customerPhone && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{c.errors.customerPhone}</p>}
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-2">
            {[{ value: 'cash', label: 'Cash', icon: DollarSign, ac: 'emerald' }, { value: 'debt', label: 'Hutang', icon: CreditCard, ac: 'amber' }].map(m => {
              const Icon = m.icon; const active = c.paymentMethod === m.value
              return (
                <button key={m.value} type="button"
                  onClick={e => { e.stopPropagation(); onFocus(); onPatch({ paymentMethod: m.value }) }}
                  className={clsx('flex items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                    active
                      ? m.ac === 'emerald' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300')}>
                  <Icon className="w-3.5 h-3.5" />{m.label}{active && <Check className="w-3 h-3 ml-auto" />}
                </button>
              )
            })}
          </div>

          {c.selectedCustomer?.activeDebt && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400">⚠️ Hutang aktif: {formatCurrency(c.selectedCustomer.activeDebt.remaining)}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">Voucher baru akan ditambahkan ke hutang ini.</p>
            </div>
          )}

          <input type="text" value={c.notes}
            onClick={e => e.stopPropagation()}
            onChange={e => onPatch({ notes: e.target.value })}
            placeholder="Catatan (opsional)" className="input h-10 text-sm" />

          {/* Vouchers */}
          {c.errors.vouchers && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{c.errors.vouchers}</p>}
          {c.vouchers.length > 0 ? (
            <div className="space-y-1.5">
              {c.vouchers.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-primary-700 dark:text-primary-300">{v.code}</span>
                    <span className="text-[11px] text-gray-400 ml-1.5 truncate">{v.package_name}</span>
                  </div>
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 shrink-0">{formatCurrency(v.price, { compact: true })}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); onRemoveVoucher(v.id) }}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">Klik voucher di sebelah kiri untuk menambahkan</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── VoucherCard ──────────────────────────────────────────────────────────────

function VoucherCard({ voucher, onAdd }) {
  const [flash, setFlash] = useState(false)
  function handleAdd() { setFlash(true); onAdd(); setTimeout(() => setFlash(false), 500) }
  return (
    <button onClick={handleAdd} type="button"
      className={clsx(
        'w-full text-left p-3.5 rounded-2xl border-2 transition-all duration-200 active:scale-95 touch-manipulation',
        flash
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800',
      )}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{voucher.code}</span>
        <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center transition-all', flash ? 'bg-primary-500 scale-110' : 'bg-primary-100 dark:bg-primary-900/40')}>
          {flash ? <Check className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />}
        </span>
      </div>
      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{voucher.package_name}</p>
      <p className="text-xs text-gray-400 mb-2">{voucher.duration}{voucher.speed ? ` · ${voucher.speed}` : ''}</p>
      <p className="text-base font-bold text-primary-600 dark:text-primary-400">{formatCurrency(voucher.price)}</p>
    </button>
  )
}

// ─── ResultsList ──────────────────────────────────────────────────────────────

function ResultsList({ results, downloading, onDownload }) {
  const ok    = results.filter(r => r.success).length
  const fail  = results.length - ok
  const total = results.filter(r => r.success).reduce((s, r) => s + Number(r.sale?.total_amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
          <p className="text-2xl font-bold text-emerald-600">{ok}</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Berhasil</p>
        </div>
        <div className={clsx('rounded-2xl p-3 text-center border', fail > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700')}>
          <p className={clsx('text-2xl font-bold', fail > 0 ? 'text-red-600' : 'text-gray-300 dark:text-gray-600')}>{fail}</p>
          <p className={clsx('text-xs font-semibold', fail > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400')}>Gagal</p>
        </div>
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-3 text-center border border-primary-100 dark:border-primary-800">
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400 leading-tight">{formatCurrency(total, { compact: true })}</p>
          <p className="text-xs text-primary-700 dark:text-primary-400 font-semibold">Total</p>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className={clsx('rounded-2xl p-3.5 border', r.success ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
            <div className="flex items-start gap-3">
              {r.success ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.slot.customerName}</p>
                {r.success
                  ? <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{r.vouchers?.length}v</span>
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{formatCurrency(r.sale?.total_amount)}</span>
                      <Badge variant={r.slot.paymentMethod === 'cash' ? 'green' : 'yellow'} className="text-[10px]">{r.slot.paymentMethod === 'cash' ? 'Cash' : 'Hutang'}</Badge>
                    </div>
                  : <p className="text-xs text-red-600 mt-0.5">{r.error}</p>
                }
              </div>
              {r.success && (
                <button type="button" onClick={() => onDownload(r)} disabled={downloading === r.slot._id}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-xl transition-colors active:scale-90 touch-manipulation">
                  {downloading === r.slot._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Unduh
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

SellPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(SellPage)