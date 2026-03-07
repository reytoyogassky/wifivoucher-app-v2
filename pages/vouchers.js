import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import {
  Upload, Trash2, Search, Wifi, CheckCircle,
  Square, CheckSquare, MinusSquare, X, FileText, AlertCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { TableSkeleton } from '../components/ui/Skeleton'
import {
  getVouchers, deleteVoucher, deleteVouchersBulk, deleteVouchersByStatus,
  createVouchersBulk
} from '../services/voucherService'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDateTime } from '../utils/formatDate'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

const STATUS_LABEL   = { available: 'Tersedia', sold: 'Terjual' }
const STATUS_VARIANT = { available: 'green', sold: 'purple' }
const PAGE_SIZE = 20

function VouchersPage() {
  const [vouchers, setVouchers]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage]             = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected]     = useState(new Set())
  const [confirmDeleteSingle, setConfirmDeleteSingle]     = useState(null)
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll]           = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const deleteMenuRef = useRef()
  const { addToast } = useNotifications()
  const { isSuperAdmin } = useAuth()

  useEffect(() => { setPage(1); load(1) }, [search, filterStatus])
  useEffect(() => { load(page) }, [page])
  useEffect(() => {
    function handler(e) { if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target)) setShowDeleteMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  useEffect(() => { setSelected(new Set()) }, [page, filterStatus])

  async function load(p = 1) {
    setLoading(true)
    try {
      const { data, count } = await getVouchers({ page: p, limit: PAGE_SIZE, search, status: filterStatus || undefined })
      setVouchers(data); setTotalCount(count)
    } catch (err) { addToast({ type: 'error', title: 'Gagal memuat voucher', message: err.message }) }
    finally { setLoading(false) }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const allPageIds = vouchers.map(v => v.id)
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id))
  const someSelected = allPageIds.some(id => selected.has(id)) && !allSelected
  const selectedCount = selected.size

  function toggleOne(id) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allPageIds.forEach(id => n.delete(id)); return n })
    else setSelected(prev => new Set([...prev, ...allPageIds]))
  }

  async function handleDeleteSingle() {
    setDeleting(true)
    try { await deleteVoucher(confirmDeleteSingle.id); setConfirmDeleteSingle(null); addToast({ type: 'success', title: 'Voucher dihapus' }); load(page) }
    catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  async function handleDeleteSelected() {
    setDeleting(true)
    try { await deleteVouchersBulk([...selected]); setConfirmDeleteSelected(false); setSelected(new Set()); addToast({ type: 'success', title: `${selectedCount} voucher dihapus` }); load(page) }
    catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  async function handleDeleteAll() {
    setDeleting(true)
    try {
      if (confirmDeleteAll === 'all') { await deleteVouchersByStatus('available'); await deleteVouchersByStatus('sold') }
      else await deleteVouchersByStatus(confirmDeleteAll)
      setConfirmDeleteAll(false); setSelected(new Set()); addToast({ type: 'success', title: 'Voucher berhasil dihapus semua' }); load(1); setPage(1)
    } catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  const deleteAllLabel = { available: 'semua voucher Tersedia', sold: 'semua voucher Terjual', all: 'SEMUA voucher' }
  const filterPills = [{ value: '', label: 'Semua' }, { value: 'available', label: 'Tersedia' }, { value: 'sold', label: 'Terjual' }]

  return (
    <>
      <Head><title>Manajemen Voucher — WiFi Voucher Manager</title></Head>
      <div className="max-w-5xl space-y-4">

        {/* Toolbar */}
        <div className="card !p-3 space-y-3">
          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterPills.map(p => (
              <button key={p.value} onClick={() => setFilterStatus(p.value)}
                className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
                  filterStatus === p.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Cari kode voucher..." className="input pl-9 text-sm py-2 w-full"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isSuperAdmin && (
              <button onClick={() => setShowImport(true)} className="btn btn-primary btn-sm shrink-0">
                <Upload className="w-4 h-4" /> Import CSV
              </button>
            )}
            {isSuperAdmin && selectedCount > 0 && (
              <button onClick={() => setConfirmDeleteSelected(true)} className="btn btn-sm text-red-600 border-red-200 hover:bg-red-50 shrink-0">
                <Trash2 className="w-3.5 h-3.5" /> Hapus {selectedCount}
              </button>
            )}
            {isSuperAdmin && (
              <div className="relative shrink-0" ref={deleteMenuRef}>
                <button onClick={() => setShowDeleteMenu(p => !p)} className="btn btn-sm text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Semua ▾
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    <button onClick={() => { setConfirmDeleteAll('available'); setShowDeleteMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-t-xl">
                      Hapus semua <span className="font-semibold text-emerald-600">Tersedia</span>
                    </button>
                    <button onClick={() => { setConfirmDeleteAll('sold'); setShowDeleteMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                      Hapus semua <span className="font-semibold text-purple-600">Terjual</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button onClick={() => { setConfirmDeleteAll('all'); setShowDeleteMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-b-xl">
                      Hapus SEMUA voucher
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!loading && <p className="text-xs text-gray-400"><strong className="text-gray-700">{totalCount}</strong> voucher ditemukan {selectedCount > 0 && <span className="text-primary-600 font-semibold">· {selectedCount} dipilih</span>}</p>}
        </div>

        {/* Table / Cards */}
        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={4} /></div>
          ) : vouchers.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Tidak ada voucher</p>
              {isSuperAdmin && filterStatus !== 'sold' && (
                <>
                  <p className="text-xs mt-1">Import CSV untuk menambahkan voucher baru</p>
                  <button onClick={() => setShowImport(true)} className="btn btn-primary mt-4 mx-auto">
                    <Upload className="w-4 h-4" /> Import CSV
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: card grid */}
              <div className="sm:hidden grid grid-cols-2 gap-2 p-3">
                {vouchers.map(v => (
                  <div key={v.id}
                    className={clsx('border rounded-xl p-3 space-y-2 transition-all',
                      isSuperAdmin && selected.has(v.id) ? 'border-primary-400 bg-primary-50/40' : 'border-gray-200')}
                    onClick={() => isSuperAdmin && toggleOne(v.id)}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gray-900 truncate">{v.code}</span>
                      {isSuperAdmin && (
                        <button onClick={e => { e.stopPropagation(); toggleOne(v.id) }} className="text-gray-300 shrink-0 ml-1">
                          {selected.has(v.id) ? <CheckSquare className="w-3.5 h-3.5 text-primary-600" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-tight">{v.package_name}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant={STATUS_VARIANT[v.status] || 'gray'} dot>{STATUS_LABEL[v.status] || v.status}</Badge>
                      <span className="text-xs font-bold text-primary-600">{formatCurrency(v.price, { compact: true })}</span>
                    </div>
                    {isSuperAdmin && (
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteSingle(v) }}
                        className="w-full text-xs text-red-500 hover:text-red-700 flex items-center justify-center gap-1 pt-1 border-t border-gray-100">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden sm:block table-container rounded-none border-none">
                <table className="table">
                  <thead>
                    <tr>
                      {isSuperAdmin && (
                        <th className="w-10">
                          <button onClick={toggleAll} className="text-gray-400 hover:text-primary-600">
                            {allSelected ? <CheckSquare className="w-4 h-4 text-primary-600" /> : someSelected ? <MinusSquare className="w-4 h-4 text-primary-400" /> : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                      )}
                      <th>Kode Voucher</th><th>Paket</th><th>Durasi</th><th>Harga</th><th>Status</th><th>Dibuat</th>
                      {isSuperAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map(v => (
                      <tr key={v.id} className={clsx(isSuperAdmin && selected.has(v.id) && 'bg-primary-50/40')}
                        onClick={() => isSuperAdmin && toggleOne(v.id)} style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}>
                        {isSuperAdmin && (
                          <td onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleOne(v.id)} className="text-gray-400 hover:text-primary-600">
                              {selected.has(v.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                        )}
                        <td><span className="font-mono text-sm font-semibold text-gray-900">{v.code}</span></td>
                        <td className="text-sm text-gray-700">{v.package_name}</td>
                        <td className="text-sm text-gray-600">{v.duration}</td>
                        <td className="text-sm font-medium text-gray-900">{formatCurrency(v.price)}</td>
                        <td><Badge variant={STATUS_VARIANT[v.status] || 'gray'} dot>{STATUS_LABEL[v.status] || v.status}</Badge></td>
                        <td className="text-xs text-gray-400">{formatDateTime(v.created_at)}</td>
                        {isSuperAdmin && (
                          <td onClick={e => e.stopPropagation()}>
                            <button onClick={() => setConfirmDeleteSingle(v)} className="btn btn-sm !px-2 text-red-500 hover:bg-red-50 border-red-200">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!loading && <div className="px-4 pb-4"><Pagination currentPage={page} totalPages={totalPages} count={totalCount} onPageChange={setPage} /></div>}
        </div>
      </div>

      <ImportCSVModal isOpen={showImport} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); load(1); setPage(1) }} />
      <ConfirmModal isOpen={!!confirmDeleteSingle} onClose={() => setConfirmDeleteSingle(null)} onConfirm={handleDeleteSingle} loading={deleting}
        title="Hapus Voucher" message={`Yakin hapus voucher ${confirmDeleteSingle?.code}?`} confirmText="Hapus" />
      <ConfirmModal isOpen={confirmDeleteSelected} onClose={() => setConfirmDeleteSelected(false)} onConfirm={handleDeleteSelected} loading={deleting}
        title={`Hapus ${selectedCount} Voucher`} message={`Yakin hapus ${selectedCount} voucher yang dipilih?`} confirmText={`Hapus ${selectedCount} Voucher`} />
      <ConfirmModal isOpen={!!confirmDeleteAll} onClose={() => setConfirmDeleteAll(false)} onConfirm={handleDeleteAll} loading={deleting}
        title="Hapus Semua Voucher" message={`Yakin hapus ${deleteAllLabel[confirmDeleteAll] || ''}? Tidak dapat dibatalkan.`} confirmText="Ya, Hapus Semua" />
    </>
  )
}

// ── Import CSV Modal ─────────────────────────────────────────
function ImportCSVModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep]               = useState(1)
  const [file, setFile]               = useState(null)
  const [preview, setPreview]         = useState([])
  const [config, setConfig]           = useState({ packageName: '', duration: '', price: '', costPrice: '' })
  const [importing, setImporting]     = useState(false)
  const [errors, setErrors]           = useState({})
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef                  = useRef()
  const { addToast }                  = useNotifications()
  const { admin }                     = useAuth()

  function reset() { setStep(1); setFile(null); setPreview([]); setConfig({ packageName: '', duration: '', price: '', costPrice: '' }); setErrors({}) }
  function handleClose() { reset(); onClose() }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, i) => row[h] = vals[i] || '')
      return { code: row['username'] || row['code'] || '', notes: [row['password'], row['comment']].filter(Boolean).join(' | ') }
    }).filter(r => r.code)
  }

  function handleFile(f) {
    if (!f || !f.name.endsWith('.csv')) { setErrors({ file: 'File harus berformat .csv' }); return }
    setFile(f); setErrors({})
    const reader = new FileReader()
    reader.onload = e => { const rows = parseCSV(e.target.result); setPreview(rows); if (rows.length > 0) setStep(2) }
    reader.readAsText(f)
  }

  async function handleImport() {
    const errs = {}
    if (!config.packageName.trim()) errs.packageName = 'Wajib diisi'
    if (!config.duration.trim()) errs.duration = 'Wajib diisi'
    if (!config.price || isNaN(Number(config.price))) errs.price = 'Harga tidak valid'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setImporting(true)
    try {
      const vouchers = preview.map(r => ({ code: r.code, package_name: config.packageName.trim(), duration: config.duration.trim(), price: Number(config.price), cost_price: Number(config.costPrice) || 0, notes: r.notes || null, status: 'available' }))
      await createVouchersBulk(vouchers, admin?.id)
      onSuccess()
    } catch (err) { addToast({ type: 'error', title: 'Gagal import', message: err.message }) }
    finally { setImporting(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Voucher CSV" size="lg"
      footer={step === 1 ? null : (
        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="btn btn-secondary">← Ganti File</button>
          <button onClick={handleImport} disabled={importing} className="btn btn-primary flex-1">
            {importing ? 'Mengimport...' : `Import ${preview.length} Voucher`}
          </button>
        </div>
      )}>
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileInputRef.current?.click()}
            className={clsx('border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all', dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50')}>
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700">Drag & drop atau klik untuk pilih file</p>
            <p className="text-xs text-gray-400 mt-1">Format: CSV Mikhmon (Username, Password, Profile, dll)</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
          {errors.file && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{errors.file}</p>}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span><strong>{preview.length}</strong> voucher siap diimport dari <strong>{file?.name}</strong></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Nama Paket <span className="text-red-500">*</span></label><input className={clsx('input', errors.packageName && 'input-error')} value={config.packageName} onChange={e => setConfig(p => ({ ...p, packageName: e.target.value }))} placeholder="cth: Paket Harian 6 Jam" />{errors.packageName && <p className="text-xs text-red-600 mt-1">{errors.packageName}</p>}</div>
            <div><label className="label">Durasi <span className="text-red-500">*</span></label><input className={clsx('input', errors.duration && 'input-error')} value={config.duration} onChange={e => setConfig(p => ({ ...p, duration: e.target.value }))} placeholder="cth: 6 Jam" />{errors.duration && <p className="text-xs text-red-600 mt-1">{errors.duration}</p>}</div>
            <div><label className="label">Harga Jual <span className="text-red-500">*</span></label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span><input type="number" className={clsx('input pl-9', errors.price && 'input-error')} value={config.price} onChange={e => setConfig(p => ({ ...p, price: e.target.value }))} placeholder="0" /></div>{errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}</div>
            <div><label className="label">Modal (opsional)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span><input type="number" className="input pl-9" value={config.costPrice} onChange={e => setConfig(p => ({ ...p, costPrice: e.target.value }))} placeholder="0" /></div></div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Preview ({Math.min(preview.length, 5)} dari {preview.length})</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="table text-xs">
                <thead><tr><th>#</th><th>Kode</th><th>Catatan</th></tr></thead>
                <tbody>
                  {preview.slice(0, 5).map((r, i) => (
                    <tr key={i}><td className="text-gray-400">{i + 1}</td><td className="font-mono font-bold">{r.code}</td><td className="text-gray-400 truncate max-w-[150px]">{r.notes || '-'}</td></tr>
                  ))}
                  {preview.length > 5 && <tr><td colSpan={3} className="text-center text-gray-400 py-2">... dan {preview.length - 5} lainnya</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

VouchersPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(VouchersPage)