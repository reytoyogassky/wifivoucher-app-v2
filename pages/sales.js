import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { Search, Filter, Download, Eye, X, Trash2, Square, CheckSquare, MinusSquare } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import { TableSkeleton } from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import { useSales } from '../hooks/useSales'
import { getAdmins } from '../services/adminService'
import { getSalesForExport, deleteSalesBulk, deleteAllSales } from '../services/salesService'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDateTime, toInputDate } from '../utils/formatDate'
import { generateSalesPDF } from '../utils/pdfGenerator'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

function SalesPage() {
  const { sales, loading, pagination, filters, fetchSales, updateFilters, setPage } = useSales()
  const [admins, setAdmins]             = useState([])
  const [showFilters, setShowFilters]   = useState(false)
  const [exporting, setExporting]       = useState(false)
  const [detailSale, setDetailSale]     = useState(null)
  const [localFilters, setLocalFilters] = useState({})
  const [selected, setSelected]         = useState(new Set())
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll]           = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const deleteMenuRef = useRef()
  const { addToast } = useNotifications()
  const { isSuperAdmin } = useAuth()

  useEffect(() => { fetchSales(); getAdmins().then(setAdmins).catch(console.error) }, [])

  useEffect(() => {
    function handler(e) { if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target)) setShowDeleteMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setSelected(new Set()) }, [pagination.page])

  function applyFilters() { updateFilters(localFilters); setShowFilters(false) }
  function clearFilters() { setLocalFilters({}); updateFilters({}) }

  async function handleExport() {
    setExporting(true)
    try { const data = await getSalesForExport(filters); await generateSalesPDF(data, filters); addToast({ type: 'success', title: 'PDF berhasil diekspor!' }) }
    catch (err) { addToast({ type: 'error', title: 'Gagal ekspor', message: err.message }) }
    finally { setExporting(false) }
  }

  const allPageIds = sales.map(s => s.id)
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id))
  const someSelected = allPageIds.some(id => selected.has(id)) && !allSelected
  const selectedCount = selected.size

  function toggleOne(id) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allPageIds.forEach(id => n.delete(id)); return n })
    else setSelected(prev => new Set([...prev, ...allPageIds]))
  }

  async function handleDeleteSelected() {
    setDeleting(true)
    try { await deleteSalesBulk([...selected]); setConfirmDeleteSelected(false); setSelected(new Set()); addToast({ type: 'success', title: `${selectedCount} transaksi dihapus` }); fetchSales() }
    catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  async function handleDeleteAll() {
    setDeleting(true)
    try { await deleteAllSales(); setConfirmDeleteAll(false); setSelected(new Set()); addToast({ type: 'success', title: 'Semua riwayat dihapus' }); fetchSales() }
    catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  const hasActiveFilters = Object.values(filters).some(v => v)

  return (
    <>
      <Head><title>Riwayat Penjualan — WiFi Voucher Manager</title></Head>
      <div className="max-w-7xl space-y-4">

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Cari nama pelanggan..." className="input pl-10"
              onChange={e => updateFilters({ customerName: e.target.value || undefined })} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)}
              className={clsx('btn btn-secondary gap-2', hasActiveFilters && 'border-primary-300 text-primary-700 bg-primary-50')}>
              <Filter className="w-4 h-4" /> Filter
              {hasActiveFilters && <span className="w-4 h-4 bg-primary-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">!</span>}
            </button>
            <button onClick={handleExport} disabled={exporting} className="btn btn-secondary">
              <Download className="w-4 h-4" /> {exporting ? 'Ekspor...' : 'PDF'}
            </button>
            {isSuperAdmin && selectedCount > 0 && (
              <button onClick={() => setConfirmDeleteSelected(true)} className="btn text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Hapus {selectedCount}
              </button>
            )}
            {isSuperAdmin && (
              <div className="relative" ref={deleteMenuRef}>
                <button onClick={() => setShowDeleteMenu(p => !p)} className="btn text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Hapus Semua ▾
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    <button onClick={() => { setConfirmDeleteAll(true); setShowDeleteMenu(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-xl">
                      Hapus SEMUA riwayat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card animate-slide-down">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="label">Dari Tanggal</label>
                <input type="date" className="input" value={localFilters.startDate ? toInputDate(localFilters.startDate) : ''}
                  onChange={e => setLocalFilters(p => ({ ...p, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
              </div>
              <div>
                <label className="label">Sampai Tanggal</label>
                <input type="date" className="input" value={localFilters.endDate ? toInputDate(localFilters.endDate) : ''}
                  onChange={e => setLocalFilters(p => ({ ...p, endDate: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined }))} />
              </div>
              <div>
                <label className="label">Admin</label>
                <select className="input" value={localFilters.adminId || ''} onChange={e => setLocalFilters(p => ({ ...p, adminId: e.target.value || undefined }))}>
                  <option value="">Semua Admin</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Metode Bayar</label>
                <select className="input" value={localFilters.paymentMethod || ''} onChange={e => setLocalFilters(p => ({ ...p, paymentMethod: e.target.value || undefined }))}>
                  <option value="">Semua</option>
                  <option value="cash">Cash</option>
                  <option value="debt">Hutang</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={clearFilters} className="btn btn-secondary btn-sm"><X className="w-3.5 h-3.5" /> Reset</button>
              <button onClick={applyFilters} className="btn btn-primary btn-sm">Terapkan</button>
            </div>
          </div>
        )}

        {!loading && pagination.count > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span><strong className="text-gray-800">{pagination.count}</strong> transaksi</span>
            <span>•</span>
            <span>Total: <strong className="text-primary-600">{formatCurrency(sales.reduce((s, t) => s + Number(t.total_amount), 0))}</strong></span>
            {selectedCount > 0 && <><span>•</span><span className="text-primary-600 font-semibold">{selectedCount} dipilih</span></>}
          </div>
        )}

        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={6} /></div>
          ) : sales.length === 0 ? (
            <div className="py-16 text-center text-gray-400"><p className="text-sm">Tidak ada data penjualan</p></div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {sales.map(sale => (
                  <div key={sale.id} className={clsx('p-4 space-y-2', isSuperAdmin && selected.has(sale.id) && 'bg-primary-50/40')}
                    onClick={() => isSuperAdmin && toggleOne(sale.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSuperAdmin && (
                          <button onClick={e => { e.stopPropagation(); toggleOne(sale.id) }} className="shrink-0 text-gray-400">
                            {selected.has(sale.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        )}
                        <span className="font-mono text-xs text-primary-700 font-bold truncate">{sale.transaction_code || sale.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={sale.payment_method === 'cash' ? 'green' : 'yellow'} dot>
                          {sale.payment_method === 'cash' ? 'Cash' : 'Hutang'}
                        </Badge>
                        <button onClick={e => { e.stopPropagation(); setDetailSale(sale) }} className="btn btn-secondary btn-sm !px-2">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{sale.customer_name}</p>
                        <p className="text-xs text-gray-400">{sale.admins?.full_name || '-'} · {sale.sale_items?.length ?? 0} voucher · {formatDateTime(sale.created_at)}</p>
                      </div>
                      <p className="font-bold text-primary-600 shrink-0 ml-2">{formatCurrency(sale.total_amount)}</p>
                    </div>
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
                          <button onClick={toggleAll} className="text-gray-400 hover:text-primary-600 transition-colors">
                            {allSelected ? <CheckSquare className="w-4 h-4 text-primary-600" />
                              : someSelected ? <MinusSquare className="w-4 h-4 text-primary-400" />
                              : <Square className="w-4 h-4" />}
                          </button>
                        </th>
                      )}
                      <th>Kode</th><th>Pelanggan</th><th>Admin</th><th>Voucher</th><th>Total</th><th>Bayar</th><th>Tanggal</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className={isSuperAdmin && selected.has(sale.id) ? 'bg-primary-50/40' : ''}
                        onClick={() => isSuperAdmin && toggleOne(sale.id)} style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}>
                        {isSuperAdmin && (
                          <td onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleOne(sale.id)} className="text-gray-400 hover:text-primary-600">
                              {selected.has(sale.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          </td>
                        )}
                        <td><span className="font-mono text-xs text-primary-700 font-bold">{sale.transaction_code || sale.id.slice(0, 8)}</span></td>
                        <td><p className="font-medium text-gray-900">{sale.customer_name}</p>{sale.customer_phone && <p className="text-xs text-gray-400">{sale.customer_phone}</p>}</td>
                        <td className="text-gray-600">{sale.admins?.full_name || '-'}</td>
                        <td><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{sale.sale_items?.length ?? 0} voucher</span></td>
                        <td className="font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</td>
                        <td><Badge variant={sale.payment_method === 'cash' ? 'green' : 'yellow'} dot>{sale.payment_method === 'cash' ? 'Cash' : 'Hutang'}</Badge></td>
                        <td className="text-xs text-gray-500">{formatDateTime(sale.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button onClick={() => setDetailSale(sale)} className="btn btn-secondary btn-sm !px-2"><Eye className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {!loading && <div className="px-4 pb-4"><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} count={pagination.count} onPageChange={setPage} /></div>}
        </div>
      </div>

      <Modal isOpen={!!detailSale} onClose={() => setDetailSale(null)} title="Detail Transaksi" size="lg">
        {detailSale && <SaleDetail sale={detailSale} />}
      </Modal>
      <ConfirmModal isOpen={confirmDeleteSelected} onClose={() => setConfirmDeleteSelected(false)} onConfirm={handleDeleteSelected} loading={deleting}
        title={`Hapus ${selectedCount} Transaksi`} message={`Yakin hapus ${selectedCount} transaksi?`} confirmText={`Hapus ${selectedCount}`} />
      <ConfirmModal isOpen={confirmDeleteAll} onClose={() => setConfirmDeleteAll(false)} onConfirm={handleDeleteAll} loading={deleting}
        title="Hapus Semua Riwayat" message="Yakin hapus SEMUA riwayat penjualan? Tidak dapat dibatalkan." confirmText="Ya, Hapus Semua" />
    </>
  )
}

function SaleDetail({ sale }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Kode Transaksi', <span className="font-mono text-xs font-bold text-primary-700">{sale.transaction_code}</span>],
          ['Pelanggan', sale.customer_name],
          ['Telepon', sale.customer_phone || '-'],
          ['Admin', sale.admins?.full_name || '-'],
          ['Pembayaran', <Badge variant={sale.payment_method === 'cash' ? 'green' : 'yellow'}>{sale.payment_method}</Badge>],
          ['Total', <span className="font-bold text-primary-600">{formatCurrency(sale.total_amount)}</span>],
          ['Tanggal', formatDateTime(sale.created_at)],
        ].map(([label, value], i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Voucher ({sale.sale_items?.length})</p>
        <div className="space-y-2">
          {sale.sale_items?.map(item => (
            <div key={item.id} className="flex justify-between items-center border border-dashed border-primary-200 rounded-xl px-3 py-2 bg-primary-50/50">
              <div>
                <span className="text-xs font-mono font-bold text-primary-700">{item.voucher_code}</span>
                <span className="text-xs text-gray-500 ml-2">{item.package_name}</span>
              </div>
              <span className="text-xs font-semibold">{formatCurrency(item.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

SalesPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(SalesPage)