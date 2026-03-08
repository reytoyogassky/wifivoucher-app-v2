/**
 * POST /api/whatsapp/send-new-debt
 *
 * Kirim WA konfirmasi ke pelanggan saat hutang baru dibuat.
 * Dipanggil dari salesService.js setelah createSale() berhasil.
 *
 * Body:
 * {
 *   customerName:    string,
 *   customerPhone:   string,
 *   totalAmount:     number,
 *   dueDate:         string (ISO),
 *   transactionCode: string,
 *   items:           [{ package_name, voucher_code }]
 * }
 */

import { sendWhatsApp, buildNewDebtMessage } from '../../../services/whatsappService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const {
    customerName,
    customerPhone,
    totalAmount,
    dueDate,
    transactionCode,
    items,
  } = req.body

  if (!customerPhone) {
    return res.status(400).json({ message: 'Nomor telepon tidak ada' })
  }

  try {
    const message = buildNewDebtMessage({
      customerName,
      totalAmount,
      dueDate,
      transactionCode,
      items,
    })

    const result = await sendWhatsApp(customerPhone, message)

    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[WA new-debt]', err)
    // Jangan error 500 — gagal WA tidak boleh hentikan transaksi
    return res.status(200).json({ success: false, message: err.message })
  }
}