/**
 * POST /api/whatsapp/send-overdue
 *
 * Kirim WA reminder ke semua pelanggan dengan hutang overdue.
 *
 * Bisa dipanggil:
 *   A) Manual dari dashboard (tombol "Kirim Reminder")
 *   B) Otomatis via Vercel Cron (setiap hari jam 08:00)
 *
 * Header wajib untuk cron:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Body (optional, untuk manual):
 *   { debtIds: ['id1', 'id2'] }  — kirim hanya ke hutang tertentu
 *   {}                            — kirim ke semua overdue
 */

import { createServerSupabase } from '../../../services/supabaseClient'
import {
  sendWhatsAppBulk,
  buildOverdueMessage,
} from '../../../services/whatsappService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // ── Verifikasi akses ──────────────────────────────────────
  // Cron Vercel mengirim header Authorization: Bearer <CRON_SECRET>
  // Request manual dari dashboard tidak perlu header ini
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  const isCron = authHeader === `Bearer ${cronSecret}`
  const isManual = !authHeader // request dari dashboard (sudah di-protect by session)

  if (!isCron && !isManual) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const supabase = createServerSupabase()
    const { debtIds } = req.body || {}

    // ── Ambil hutang overdue ──────────────────────────────────
    const now = new Date().toISOString()

    let query = supabase
      .from('debts')
      .select(`
        id, customer_name, customer_phone,
        total_amount, paid_amount, remaining_amount,
        due_date, status,
        sales(transaction_code)
      `)
      .neq('status', 'paid')
      .lt('due_date', now)
      .not('customer_phone', 'is', null)

    if (debtIds?.length) {
      query = query.in('id', debtIds)
    }

    const { data: debts, error } = await query
    if (error) throw error

    if (!debts?.length) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada hutang overdue dengan nomor telepon',
        sent: 0,
      })
    }

    // ── Bangun daftar target WA ───────────────────────────────
    const targets = debts.map(debt => ({
      phone: debt.customer_phone,
      message: buildOverdueMessage({
        customerName:    debt.customer_name,
        totalAmount:     debt.total_amount,
        paidAmount:      debt.paid_amount,
        remainingAmount: debt.remaining_amount,
        dueDate:         debt.due_date,
        transactionCode: debt.sales?.transaction_code,
      }),
      debtId: debt.id,
    }))

    // ── Kirim WA ──────────────────────────────────────────────
    const results = await sendWhatsAppBulk(targets)

    const successCount = results.filter(r => r.success).length
    const failedCount  = results.filter(r => !r.success).length

    // ── Log hasil ke tabel wa_logs (opsional) ─────────────────
    // Uncomment kalau sudah buat tabel wa_logs di Supabase
    /*
    const logs = results.map((r, i) => ({
      debt_id:    targets[i].debtId,
      phone:      r.phone,
      type:       'overdue_reminder',
      success:    r.success,
      error_msg:  r.error || null,
      sent_at:    new Date().toISOString(),
    }))
    await supabase.from('wa_logs').insert(logs)
    */

    return res.status(200).json({
      success:      true,
      total:        targets.length,
      sent:         successCount,
      failed:       failedCount,
      results,
    })

  } catch (err) {
    console.error('[WA overdue]', err)
    return res.status(500).json({ message: err.message })
  }
}