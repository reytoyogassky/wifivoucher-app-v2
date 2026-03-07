import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

function formatRp(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const channelRef   = useRef(null)
  const voucherBatch = useRef([])
  const voucherTimer = useRef(null)
  const { isAuthenticated } = useAuth()

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, title, message }])
    if (duration > 0) setTimeout(() => removeToast(id), duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addNotification = useCallback((notification) => {
    const n = { id: Date.now(), read: false, created_at: new Date().toISOString(), ...notification }
    setNotifications(prev => [n, ...prev].slice(0, 50))
    addToast({ type: n.type || 'info', title: n.title, message: n.message })
  }, [addToast])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!isAuthenticated) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel('app-notifications', { config: { broadcast: { self: false } } })

      // ① Transaksi baru
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, async (payload) => {
        const sale = payload.new
        let adminName = 'Admin'
        if (sale.admin_id) {
          const { data } = await supabase.from('admins').select('full_name').eq('id', sale.admin_id).single()
          if (data) adminName = data.full_name
        }
        addNotification({
          type: 'success', icon: '🛒',
          title: `${adminName} · Transaksi Baru `,
          message: `${sale.customer_name} · ${formatRp(sale.total_amount)} · ${sale.payment_method === 'cash' ? 'Cash' : 'Hutang'}`,
        })
      })

      // ② Pembayaran hutang
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debt_payments' }, async (payload) => {
        const payment = payload.new
        let customerName = 'Pelanggan', adminName = 'Admin', remaining = null
        try {
          const { data: debt } = await supabase.from('debts').select('customer_name, remaining_amount').eq('id', payment.debt_id).single()
          if (debt) { customerName = debt.customer_name; remaining = Number(debt.remaining_amount) }
          if (payment.admin_id) {
            const { data: adm } = await supabase.from('admins').select('full_name').eq('id', payment.admin_id).single()
            if (adm) adminName = adm.full_name
          }
        } catch {}
        const sisaText = remaining !== null && remaining > 0
          ? ` · Sisa ${formatRp(remaining)}`
          : remaining === 0 ? ' · ✅ LUNAS' : ''
        addNotification({
          type: 'info', icon: '💰',
          title: `${adminName} · Bayar Hutang `,
          message: `${customerName} membayar ${formatRp(payment.amount)}${sisaText}`,
        })
      })

      // ③ Voucher baru — debounce 1 detik
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vouchers' }, async (payload) => {
        voucherBatch.current.push(payload.new)
        if (voucherTimer.current) clearTimeout(voucherTimer.current)
        voucherTimer.current = setTimeout(async () => {
          const batch = [...voucherBatch.current]
          voucherBatch.current = []
          let adminName = 'Admin'
          const createdBy = batch[0]?.created_by
          if (createdBy) {
            const { data } = await supabase.from('admins').select('full_name').eq('id', createdBy).single()
            if (data) adminName = data.full_name
          }
          const paketSet = [...new Set(batch.map(v => v.package_name))]
          const paketLabel = paketSet.length === 1 ? paketSet[0] : `${paketSet.length} paket berbeda`
          addNotification({
            type: 'info', icon: '🎫',
            title: `${adminName} · Tambah ${batch.length} Voucher`,
            message: `${paketLabel} · ${batch.length} voucher baru tersedia`,
          })
        }, 1000)
      })

      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log('[Realtime] ✅ Connected')
        else if (status === 'CHANNEL_ERROR') console.error('[Realtime] ❌ Error:', err)
      })

    channelRef.current = channel
    checkOverdueDebts()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (voucherTimer.current) clearTimeout(voucherTimer.current)
    }
  }, [isAuthenticated, addNotification])

  async function checkOverdueDebts() {
    try {
      const { data, error } = await supabase.from('debts')
        .select('id, customer_name, remaining_amount, due_date')
        .lt('due_date', new Date().toISOString()).neq('status', 'paid').limit(5)
      if (error || !data?.length) return
      addNotification({
        type: 'error', icon: '⚠️',
        title: `⚠️ ${data.length} Hutang Melewati Jatuh Tempo`,
        message: `${data[0].customer_name}${data.length > 1 ? ` +${data.length - 1} lainnya` : ''} belum terbayar`,
      })
    } catch {}
  }

  return (
    <NotificationContext.Provider value={{ notifications, toasts, unreadCount, addToast, removeToast, addNotification, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}