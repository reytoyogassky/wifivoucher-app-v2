import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { Search, Download, AlertTriangle, X, Banknote, Trash2, Square, CheckSquare, MinusSquare, MessageCircle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Badge from '../components/ui/Badge'
import Pagination from '../components/ui/Pagination'
import { TableSkeleton, CardSkeleton } from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import StatCard from '../components/cards/StatCard'
import { useDebts } from '../hooks/useDebts'
import { getDebtsForExport, deleteDebtsBulk, deleteDebtsByStatus, deleteAllDebts } from '../services/debtService'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDateTime, formatDate, isOverdue } from '../utils/formatDate'
import { generateDebtsPDF } from '../utils/pdfGenerator'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

function DebtsPage() {
  const { debts, summary, loading, pagination, filters, fetchDebts, fetchSummary, handlePayDebt, updateFilters, setPage } = useDebts()
  const [payModal, setPayModal]         = useState(null)
  const [payAmount, setPayAmount]       = useState('')
  const [payNotes, setPayNotes]         = useState('')
  const [paying, setPaying]             = useState(false)
  const [activeTab, setActiveTab]       = useState('all')
  const [exporting, setExporting]       = useState(false)
  const [sendingWA, setSendingWA]       = useState(false)
  const [selected, setSelected]         = useState(new Set())
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll]           = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const deleteMenuRef = useRef()
  const { addToast } = useNotifications()
  const { isSuperAdmin } = useAuth()

  useEffect(() => { fetchDebts({ status: activeTab === 'all' ? undefined : activeTab }); fetchSummary() }, [activeTab])
  useEffect(() => {
    function handler(e) { if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target)) setShowDeleteMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  useEffect(() => { setSelected(new Set()) }, [activeTab, pagination.page])

  async function handleExport() {
    setExporting(true)
    try { const data = await getDebtsForExport({ status: activeTab === 'all' ? undefined : activeTab }); await generateDebtsPDF(data); addToast({ type: 'success', title: 'PDF berhasil diekspor!' }) }
    catch (err) { addToast({ type: 'error', title: 'Gagal ekspor', message: err.message }) }
    finally { setExporting(false) }
  }

  async function handleSendWA() {
    setSendingWA(true)
    try {
      // Kirim ke semua overdue, atau hanya yang dipilih kalau ada selected
      const body = selected.size > 0 ? { debtIds: [...selected] } : {}
      const res = await fetch('/api/whatsapp/send-overdue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      addToast({
        type: 'success',
        title: `WA terkirim ke ${data.sent} pelanggan`,
        message: data.failed > 0 ? `${data.failed} gagal (cek nomor telepon)` : undefined,
      })
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal kirim WA', message: err.message })
    } finally {
      setSendingWA(false)
    }
  }

  async function submitPayment() {
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) { addToast({ type: 'error', title: 'Jumlah tidak valid' }); return }
    setPaying(true)
    const success = await handlePayDebt(payModal.id, Number(payAmount), payNotes)
    if (success) { setPayModal(null); setPayAmount(''); setPayNotes('') }
    setPaying(false)
  }

  const allPageIds = debts.map(d => d.id)
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
    try { await deleteDebtsBulk([...selected]); setConfirmDeleteSelected(false); setSelected(new Set()); addToast({ type: 'success', title: `${selectedCount} hutang dihapus` }); fetchDebts({ status: activeTab === 'all' ? undefined : activeTab }); fetchSummary() }
    catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  async function handleDeleteAll() {
    setDeleting(true)
    try {
      if (confirmDeleteAll === 'all') await deleteAllDebts()
      else await deleteDebtsByStatus(confirmDeleteAll)
      setConfirmDeleteAll(false); setSelected(new Set()); addToast({ type: 'success', title: 'Data hutang dihapus' }); fetchDebts({ status: activeTab === 'all' ? undefined : activeTab }); fetchSummary()
    } catch (err) { addToast({ type: 'error', title: 'Gagal hapus', message: err.message }) }
    finally { setDeleting(false) }
  }

  const deleteAllLabel = { unpaid: 'semua hutang Belum Lunas', partial: 'semua hutang Sebagian', paid: 'semua hutang Lunas', all: 'SEMUA data hutang' }
  const tabs = [{ key: 'unpaid', label: 'Belum Lunas' }, { key: 'partial', label: 'Sebagian' }, { key: 'paid', label: 'Lunas' }, { key: 'all', label: 'Semua' }]

  return (
    <>
      <Head><title>Data Hutang — WiFi Voucher Manager</title></Head>
      <div className="max-w-7xl space-y-6">

        {/* Summary stats */}
        {!summary ? <CardSkeleton count={4} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Hutang" value={formatCurrency(summary.totalDebt, { compact: true })} icon={Banknote} color="red" />
            <StatCard title="Sudah Dibayar" value={formatCurrency(summary.totalPaid, { compact: true })} icon={Banknote} color="green" />
            <StatCard title="Sisa Hutang" value={formatCurrency(summary.totalRemaining, { compact: true })} icon={Banknote} color="amber" />
            <StatCard title="Overdue" value={summary.overdueCount} subtitle="hutang jatuh tempo" icon={AlertTriangle} color={summary.overdueCount > 0 ? 'red' : 'green'} />
          </div>
        )}

        {summary?.overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">{summary.overdueCount} hutang melewati jatuh tempo!</p>
              <p className="text-xs text-red-600 mt-0.5">Segera hubungi pelanggan untuk penagihan</p>
            </div>
          </div>
        )}

        <div className="card !p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 border-b border-gray-100 space-y-3">
            {/* Tabs — scrollable on mobile */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0',
                    activeTab === tab.key ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')}>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Cari pelanggan..." className="input pl-9 text-sm py-2 w-full"
                  onChange={e => updateFilters({ customerName: e.target.value || undefined, status: activeTab === 'all' ? undefined : activeTab })} />
              </div>
              <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm shrink-0">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              {isSuperAdmin && (
                <button
                  onClick={handleSendWA}
                  disabled={sendingWA}
                  className="btn btn-sm shrink-0 bg-green-500 hover:bg-green-600 text-white border-green-500"
                  title={selected.size > 0 ? `Kirim WA ke ${selected.size} dipilih` : 'Kirim WA reminder ke semua overdue'}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {sendingWA ? 'Mengirim...' : selected.size > 0 ? `WA (${selected.size})` : 'WA Overdue'}
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
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20">
                      {[{ key: 'unpaid', label: 'Belum Lunas', color: 'text-red-600' }, { key: 'partial', label: 'Sebagian', color: 'text-amber-600' }, { key: 'paid', label: 'Lunas', color: 'text-emerald-600' }].map((s, i) => (
                        <button key={s.key} onClick={() => { setConfirmDeleteAll(s.key); setShowDeleteMenu(false) }}
                          className={clsx('w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700', i === 0 && 'rounded-t-xl')}>
                          Hapus semua <span className={clsx('font-semibold', s.color)}>{s.label}</span>
                        </button>
                      ))}
                      <div className="border-t border-gray-100" />
                      <button onClick={() => { setConfirmDeleteAll('all'); setShowDeleteMenu(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-b-xl">
                        Hapus SEMUA hutang
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={7} /></div>
          ) : debts.length === 0 ? (
            <div className="py-16 text-center text-gray-400"><p className="text-sm">Tidak ada data hutang</p></div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {debts.map(debt => {
                  const pct = (Number(debt.paid_amount) / Number(debt.total_amount)) * 100
                  const overdue = isOverdue(debt.due_date) && debt.status !== 'paid'
                  return (
                    <div key={debt.id}
                      className={clsx('p-4 space-y-3', overdue && 'bg-red-50/30', isSuperAdmin && selected.has(debt.id) && 'bg-primary-50/40')}
                      onClick={() => isSuperAdmin && toggleOne(debt.id)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSuperAdmin && (
                            <button onClick={e => { e.stopPropagation(); toggleOne(debt.id) }} className="shrink-0 text-gray-400">
                              {selected.has(debt.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{debt.customer_name}</p>
                            {debt.customer_phone && <p className="text-xs text-gray-400">{debt.customer_phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={debt.status === 'paid' ? 'green' : debt.status === 'partial' ? 'yellow' : 'red'} dot>
                            {debt.status === 'paid' ? 'Lunas' : debt.status === 'partial' ? 'Sebagian' : 'Belum'}
                          </Badge>
                          {debt.status !== 'paid' && (
                            <button onClick={e => { e.stopPropagation(); setPayModal(debt); setPayAmount(String(debt.remaining_amount)) }}
                              className="btn btn-success btn-sm text-xs">
                              <Banknote className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-gray-400">Total</p><p className="font-semibold">{formatCurrency(debt.total_amount, { compact: true })}</p></div>
                        <div><p className="text-gray-400">Dibayar</p><p className="font-semibold text-emerald-600">{formatCurrency(debt.paid_amount, { compact: true })}</p></div>
                        <div><p className="text-gray-400">Sisa</p><p className="font-bold text-red-600">{formatCurrency(debt.remaining_amount, { compact: true })}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className={clsx('h-1.5 rounded-full', pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300')} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
                        {debt.due_date && (
                          <span className={clsx('text-xs flex items-center gap-0.5', overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                            {overdue && <AlertTriangle className="w-3 h-3" />}{formatDate(debt.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                      <th>Pelanggan</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Progress</th><th>Status</th><th>Jatuh Tempo</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map(debt => {
                      const pct = (Number(debt.paid_amount) / Number(debt.total_amount)) * 100
                      const overdue = isOverdue(debt.due_date) && debt.status !== 'paid'
                      return (
                        <tr key={debt.id} className={clsx(overdue && 'bg-red-50/40', isSuperAdmin && selected.has(debt.id) && 'bg-primary-50/40')}
                          onClick={() => isSuperAdmin && toggleOne(debt.id)} style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}>
                          {isSuperAdmin && (
                            <td onClick={e => e.stopPropagation()}>
                              <button onClick={() => toggleOne(debt.id)} className="text-gray-400 hover:text-primary-600">
                                {selected.has(debt.id) ? <CheckSquare className="w-4 h-4 text-primary-600" /> : <Square className="w-4 h-4" />}
                              </button>
                            </td>
                          )}
                          <td><p className="font-medium text-gray-900 dark:text-white">{debt.customer_name}</p>{debt.customer_phone && <p className="text-xs text-gray-400">{debt.customer_phone}</p>}</td>
                          <td className="font-medium">{formatCurrency(debt.total_amount)}</td>
                          <td className="text-emerald-600 font-medium">{formatCurrency(debt.paid_amount)}</td>
                          <td className="text-red-600 font-bold">{formatCurrency(debt.remaining_amount)}</td>
                          <td className="min-w-[100px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className={clsx('h-1.5 rounded-full', pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-300')} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{Math.round(pct)}%</span>
                            </div>
                          </td>
                          <td><Badge variant={debt.status === 'paid' ? 'green' : debt.status === 'partial' ? 'yellow' : 'red'} dot>{debt.status === 'paid' ? 'Lunas' : debt.status === 'partial' ? 'Sebagian' : 'Belum'}</Badge></td>
                          <td>{debt.due_date ? <div className={clsx('flex items-center gap-1 text-xs', overdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400')}>{overdue && <AlertTriangle className="w-3 h-3" />}{formatDate(debt.due_date)}</div> : '-'}</td>
                          <td onClick={e => e.stopPropagation()}>
                            {debt.status !== 'paid' && (
                              <button onClick={() => { setPayModal(debt); setPayAmount(String(debt.remaining_amount)) }} className="btn btn-success btn-sm text-xs">
                                <Banknote className="w-3 h-3" /> Bayar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && <div className="px-4 pb-4"><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} count={pagination.count} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Pay Modal */}
      <Modal isOpen={!!payModal} onClose={() => setPayModal(null)} title="Pembayaran Hutang" size="sm"
        footer={<div className="flex gap-3"><button onClick={() => setPayModal(null)} className="btn btn-secondary flex-1" disabled={paying}>Batal</button><button onClick={submitPayment} className="btn btn-success flex-1" disabled={paying}>{paying ? 'Memproses...' : 'Konfirmasi Bayar'}</button></div>}>
        {payModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Pelanggan</p>
              <p className="font-semibold text-gray-900 dark:text-white">{payModal.customer_name}</p>
              <div className="flex justify-between mt-2 text-sm"><span className="text-gray-500 dark:text-gray-400">Sisa hutang</span><span className="font-bold text-red-600">{formatCurrency(payModal.remaining_amount)}</span></div>
            </div>
            <div>
              <label className="label">Jumlah Bayar <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 font-medium">Rp</span>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="input pl-9" min="1" max={payModal.remaining_amount} placeholder="0" />
              </div>
              <button type="button" onClick={() => setPayAmount(String(payModal.remaining_amount))} className="text-xs text-primary-600 font-medium mt-2">Bayar Lunas ({formatCurrency(payModal.remaining_amount)})</button>
            </div>
            <div>
              <label className="label">Catatan</label>
              <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} className="input resize-none" rows={2} placeholder="Opsional..." />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal isOpen={confirmDeleteSelected} onClose={() => setConfirmDeleteSelected(false)} onConfirm={handleDeleteSelected} loading={deleting}
        title={`Hapus ${selectedCount} Data Hutang`} message={`Yakin hapus ${selectedCount} data hutang yang dipilih?`} confirmText={`Hapus ${selectedCount} Data`} />
      <ConfirmModal isOpen={!!confirmDeleteAll} onClose={() => setConfirmDeleteAll(false)} onConfirm={handleDeleteAll} loading={deleting}
        title="Hapus Data Hutang" message={`Yakin hapus ${deleteAllLabel[confirmDeleteAll] || ''}?`} confirmText="Ya, Hapus Semua" />
    </>
  )
}

DebtsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(DebtsPage)