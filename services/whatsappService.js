/**
 * ══════════════════════════════════════════════
 *  WhatsApp Service — via Fonnte API
 *  https://fonnte.com
 * ══════════════════════════════════════════════
 *
 * Setup:
 * 1. Daftar di fonnte.com
 * 2. Tambah device → scan QR dengan WA kamu
 * 3. Copy token dari dashboard Fonnte
 * 4. Tambahkan ke .env.local:
 *    FONNTE_TOKEN=xxxxxxxxxxxxxxxx
 */

const FONNTE_API = 'https://api.fonnte.com/send'

/**
 * Normalisasi nomor HP ke format internasional (628xxx)
 */
export function normalizePhone(phone) {
  if (!phone) return null
  // Hapus semua karakter non-digit
  let num = phone.replace(/\D/g, '')

  if (num.startsWith('0')) {
    num = '62' + num.slice(1)       // 08xxx → 628xxx
  } else if (num.startsWith('8')) {
    num = '62' + num                 // 8xxx  → 628xxx
  } else if (!num.startsWith('62')) {
    num = '62' + num                 // fallback
  }

  return num
}

/**
 * Kirim pesan WA ke satu nomor
 * @param {string} to    - Nomor tujuan (akan dinormalisasi otomatis)
 * @param {string} message - Isi pesan
 * @returns {{ success: boolean, message: string }}
 */
export async function sendWhatsApp(to, message) {
  const token = process.env.FONNTE_TOKEN
  if (!token) throw new Error('FONNTE_TOKEN belum diset di .env.local')

  const phone = normalizePhone(to)
  if (!phone) throw new Error('Nomor telepon tidak valid')

  const res = await fetch(FONNTE_API, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      target: phone,
      message,
      countryCode: '62',
    }),
  })

  const data = await res.json()

  if (!res.ok || data.status === false) {
    throw new Error(data.reason || data.message || 'Gagal mengirim WA')
  }

  return { success: true, message: 'WA terkirim', phone }
}

/**
 * Kirim WA ke banyak nomor sekaligus (dengan delay agar tidak kena rate limit)
 * @param {Array<{phone: string, message: string}>} targets
 */
export async function sendWhatsAppBulk(targets, delayMs = 1500) {
  const results = []

  for (const { phone, message } of targets) {
    try {
      const result = await sendWhatsApp(phone, message)
      results.push({ phone, success: true, ...result })
    } catch (err) {
      results.push({ phone, success: false, error: err.message })
    }
    // Delay antar pesan agar tidak spam
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
  }

  return results
}

/**
 * Template pesan: hutang overdue
 */
export function buildOverdueMessage({ customerName, totalAmount, paidAmount, remainingAmount, dueDate, transactionCode }) {
  const formatRp = (n) =>
    'Rp ' + Number(n).toLocaleString('id-ID')

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  return `Halo *${customerName}*! 👋

⚠️ *Pengingat Hutang Jatuh Tempo*

Kami ingin mengingatkan bahwa tagihan WiFi kamu sudah melewati jatuh tempo.

📋 Detail tagihan:
• Kode: *${transactionCode || '-'}*
• Total: *${formatRp(totalAmount)}*
• Sudah dibayar: ${formatRp(paidAmount)}
• *Sisa: ${formatRp(remainingAmount)}*
• Jatuh tempo: ${dueDateStr}

Mohon segera lakukan pembayaran. Hubungi kami jika ada pertanyaan.

Terima kasih! 🙏
_WifiSekre.net_`
}

/**
 * Template pesan: hutang baru dibuat
 */
export function buildNewDebtMessage({ customerName, totalAmount, dueDate, transactionCode, items }) {
  const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

  const dueDateStr = dueDate
    ? new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const itemList = items?.length
    ? items.map(i => `  - ${i.package_name} (${i.voucher_code})`).join('\n')
    : '  -'

  return `Halo *${customerName}*! 👋

📦 *Konfirmasi Pembelian Voucher WiFi*

Berikut detail transaksi kamu:

🧾 Kode: *${transactionCode || '-'}*
📋 Voucher:
${itemList}

💰 Total: *${formatRp(totalAmount)}*
📅 Jatuh tempo: *${dueDateStr}*

Pembayaran bisa dilakukan sebelum jatuh tempo. Hubungi kami jika ada pertanyaan.

Terima kasih sudah berlangganan! 🙏
_WifiSekre.net_`
}

/**
 * Template pesan: konfirmasi lunas
 */
export function buildPaidMessage({ customerName, totalAmount, transactionCode }) {
  const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

  return `Halo *${customerName}*! 👋

✅ *Pembayaran Diterima*

Terima kasih! Pembayaran kamu sebesar *${formatRp(totalAmount)}* untuk kode *${transactionCode || '-'}* telah kami terima dan lunas.

Selamat menikmati layanan WiFi! 🌐
_WifiSekre.net_`
}