/**
 * PDF Report Generator — Formal & Detailed
 * Uses jsPDF via dynamic import (avoid SSR issues)
 */

const APP_NAME    = 'Wifisekre.net'
const APP_TAGLINE = 'Sistem Manajemen Voucher WiFi'

function rp(amount) {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`
}

function printedAt() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }) + ' · ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function drawHeader(doc, pageW, title, subtitle, accent) {
  const [r, g, b] = accent
  doc.setFillColor(r, g, b)
  doc.rect(0, 0, pageW, 2, 'F')
  doc.setFillColor(248, 248, 252)
  doc.rect(0, 2, pageW, 30, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(APP_NAME, 14, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(APP_TAGLINE, 14, 20)

  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.5)
  doc.line(14, 24, pageW - 14, 24)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(r, g, b)
  doc.text(title, pageW - 14, 14, { align: 'right' })

  if (subtitle) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(subtitle, pageW - 14, 20, { align: 'right' })
  }

  doc.setLineWidth(0.1)
  return 36
}

function drawInfoBox(doc, pageW, y, items) {
  doc.setFillColor(250, 250, 252)
  doc.setDrawColor(220, 220, 230)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y, pageW - 28, 12, 1.5, 1.5, 'FD')

  const colW = (pageW - 28) / items.length
  items.forEach(([label, value], i) => {
    const x = 14 + i * colW + 4
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(130, 130, 130)
    doc.text(label, x, y + 4.5)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text(String(value), x, y + 9.5)
  })

  doc.setLineWidth(0.1)
  return y + 17
}

function drawSummaryCards(doc, pageW, y, cards, accent) {
  const [r, g, b] = accent
  const gap   = 3
  const cardW = (pageW - 28 - gap * (cards.length - 1)) / cards.length

  cards.forEach(({ label, value, highlight }, i) => {
    const x = 14 + i * (cardW + gap)
    doc.setFillColor(highlight ? r : 245, highlight ? g : 245, highlight ? b : 250)
    doc.setDrawColor(highlight ? r : 220, highlight ? g : 220, highlight ? b : 232)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'FD')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(highlight ? 255 : 100, highlight ? 255 : 100, highlight ? 255 : 110)
    doc.text(label, x + cardW / 2, y + 6.5, { align: 'center' })

    doc.setFontSize(highlight ? 10 : 9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(highlight ? 255 : r, highlight ? 255 : g, highlight ? 255 : b)
    doc.text(String(value), x + cardW / 2, y + 13.5, { align: 'center' })
  })

  doc.setLineWidth(0.1)
  return y + 24
}

function drawSectionTitle(doc, y, label, accent) {
  const [r, g, b] = accent
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text(label, 14, y)
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.4)
  doc.line(14, y + 2, 14 + label.length * 2.2, y + 2)
  doc.setLineWidth(0.1)
  return y + 7
}

function drawTableHeader(doc, pageW, y, cols, colWidths, accent) {
  const [r, g, b] = accent
  doc.setFillColor(r, g, b)
  doc.rect(14, y, pageW - 28, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  let x = 14
  cols.forEach((col, i) => {
    doc.text(col, x + 3, y + 6)
    x += colWidths[i]
  })
  return y + 9
}

function drawFooters(doc, pageW, pageH, accent) {
  const [r, g, b] = accent
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(r, g, b)
    doc.setLineWidth(0.3)
    doc.line(14, pageH - 12, pageW - 14, pageH - 12)
    doc.setLineWidth(0.1)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(APP_NAME + ' — ' + APP_TAGLINE, 14, pageH - 7)
    doc.text(`Halaman ${i} dari ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSalesPDF(sales, filters = {}) {
  const { jsPDF } = await import('jspdf')
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ACCENT = [109, 40, 217]

  const subtitle = filters.startDate
    ? `Periode: ${filters.startDate} s/d ${filters.endDate || '-'}`
    : null

  let y = drawHeader(doc, pageW, 'LAPORAN PENJUALAN', subtitle, ACCENT)

  // ── Hitung statistik ──────────────────────────────────────────────────────
  const totalRevenue  = sales.reduce((s, x) => s + Number(x.total_amount), 0)
  const cashRevenue   = sales.filter(s => s.payment_method === 'cash').reduce((s, x) => s + Number(x.total_amount), 0)
  const debtRevenue   = totalRevenue - cashRevenue
  const cashCount     = sales.filter(s => s.payment_method === 'cash').length
  const debtCount     = sales.length - cashCount

  // Status hutang
  const debtSales     = sales.filter(s => s.payment_method === 'debt')
  const debtPaid      = debtSales.filter(s => s.debts?.[0]?.status === 'paid').length
  const debtUnpaid    = debtSales.filter(s => s.debts?.[0]?.status === 'unpaid').length
  const debtPartial   = debtSales.filter(s => s.debts?.[0]?.status === 'partial').length

  // Profit = cash revenue + semua pembayaran hutang yang masuk
  const debtPaymentsTotal = sales.reduce((sum, s) => {
    const payments = s.debts?.[0]?.debt_payments || []
    return sum + payments.reduce((ps, p) => ps + Number(p.amount), 0)
  }, 0)
  const totalProfit = cashRevenue + debtPaymentsTotal

  y = drawInfoBox(doc, pageW, y, [
    ['Tanggal Cetak', printedAt()],
    ['Total Transaksi', `${sales.length} transaksi`],
    ['Transaksi Cash', `${cashCount} transaksi`],
    ['Transaksi Hutang', `${debtCount} transaksi`],
    ['Hutang Lunas', `${debtPaid} transaksi`],
    ['Hutang Belum Lunas', `${debtUnpaid + debtPartial} transaksi`],
  ])

  y = drawSummaryCards(doc, pageW, y, [
    { label: 'Total Pendapatan', value: rp(totalRevenue) },
    { label: 'Cash Masuk', value: rp(cashRevenue) },
    { label: 'Hutang Terbayar', value: rp(debtPaymentsTotal) },
    { label: 'Total Profit', value: rp(totalProfit), highlight: true },
  ], ACCENT)

  y = drawSectionTitle(doc, y, 'RINCIAN TRANSAKSI', ACCENT)

  // Kolom: tambah Status Hutang & Profit
  const cols      = ['No', 'Kode Transaksi', 'Pelanggan', 'No. Telepon', 'Admin', 'Voucher', 'Metode', 'Status Hutang', 'Total', 'Terbayar', 'Tanggal & Jam']
  const colWidths = [9, 30, 32, 25, 24, 38, 18, 22, 26, 26, 32]

  y = drawTableHeader(doc, pageW, y, cols, colWidths, ACCENT)

  doc.setFont('helvetica', 'normal')
  sales.forEach((sale, idx) => {
    if (y > pageH - 22) {
      doc.addPage()
      y = drawTableHeader(doc, pageW, 15, cols, colWidths, ACCENT)
    }

    const isDebt    = sale.payment_method !== 'cash'
    const debt      = sale.debts?.[0]
    const debtStatus = debt?.status || null
    const paidAmount = isDebt
      ? (debt?.debt_payments || []).reduce((s, p) => s + Number(p.amount), 0)
      : Number(sale.total_amount)

    // Status hutang label & color
    const statusMap = { paid: 'Lunas', unpaid: 'Belum Lunas', partial: 'Sebagian' }
    const statusColorMap = {
      paid:    [22, 163, 74],
      partial: [217, 119, 6],
      unpaid:  [220, 38, 38],
    }

    const rowBg = !isDebt
      ? idx % 2 === 0 ? [255, 255, 255] : [248, 248, 252]
      : debtStatus === 'paid' ? [240, 253, 244]
      : debtStatus === 'partial' ? [255, 251, 235]
      : [255, 245, 245]

    doc.setFillColor(...rowBg)
    doc.rect(14, y, pageW - 28, 8, 'F')
    doc.setFontSize(7.5)

    const vouchers  = sale.sale_items?.map(i => i.voucher_code).join(', ') || '-'
    const adminName = sale.admins?.full_name || '-'
    const date      = new Date(sale.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    const time      = new Date(sale.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

    const rowData = [
      String(idx + 1),
      sale.transaction_code || '-',
      sale.customer_name,
      sale.customer_phone || '-',
      adminName,
      vouchers.length > 22 ? vouchers.slice(0, 20) + '…' : vouchers,
      isDebt ? 'Hutang' : 'Cash',
      isDebt ? (statusMap[debtStatus] || '-') : '-',
      rp(sale.total_amount),
      rp(paidAmount),
      `${date} ${time}`,
    ]

    let x = 14
    rowData.forEach((cell, i) => {
      if (i === 6) {
        // Metode bayar
        doc.setTextColor(isDebt ? 180 : 22, isDebt ? 100 : 163, isDebt ? 0 : 74)
        doc.setFont('helvetica', 'bold')
      } else if (i === 7 && isDebt && debtStatus) {
        // Status hutang
        const [sr, sg, sb] = statusColorMap[debtStatus] || [100, 100, 100]
        doc.setTextColor(sr, sg, sb)
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setTextColor(50, 50, 50)
        doc.setFont('helvetica', 'normal')
      }
      doc.text(String(cell), x + 3, y + 5.2)
      x += colWidths[i]
    })

    doc.setDrawColor(220, 220, 230)
    doc.line(14, y + 8, pageW - 14, y + 8)
    y += 8
  })

  // Total row
  doc.setFillColor(235, 228, 255)
  doc.rect(14, y, pageW - 28, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT)
  doc.text('TOTAL KESELURUHAN', 17, y + 5.2)
  const totalX = 14 + colWidths.slice(0, 8).reduce((a, b) => a + b, 0)
  doc.text(rp(totalRevenue), totalX + 3, y + 5.2)
  doc.text(rp(totalProfit),  totalX + colWidths[8] + 3, y + 5.2)
  y += 10

  // Profit note
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text(`* Profit = Cash masuk (${rp(cashRevenue)}) + Hutang terbayar (${rp(debtPaymentsTotal)}) = ${rp(totalProfit)}`, 14, y)

  drawFooters(doc, pageW, pageH, ACCENT)
  doc.save(`laporan-penjualan-${Date.now()}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBTS PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDebtsPDF(debts) {
  const { jsPDF } = await import('jspdf')
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ACCENT = [220, 38, 38]

  const totalDebt      = debts.reduce((s, d) => s + Number(d.total_amount), 0)
  const totalPaid      = debts.reduce((s, d) => s + Number(d.paid_amount), 0)
  const totalRemaining = debts.reduce((s, d) => s + Number(d.remaining_amount), 0)
  const paidCount      = debts.filter(d => d.status === 'paid').length
  const unpaidCount    = debts.filter(d => d.status === 'unpaid').length
  const partialCount   = debts.filter(d => d.status === 'partial').length
  const overdueCount   = debts.filter(d => d.status !== 'paid' && d.due_date && new Date(d.due_date) < new Date()).length

  let y = drawHeader(doc, pageW, 'LAPORAN DATA HUTANG', null, ACCENT)

  y = drawInfoBox(doc, pageW, y, [
    ['Tanggal Cetak', printedAt()],
    ['Total Debtor', `${debts.length} orang`],
    ['Lunas', `${paidCount} orang`],
    ['Belum Lunas', `${unpaidCount} orang`],
    ['Sebagian', `${partialCount} orang`],
    ['Overdue', `${overdueCount} orang`],
  ])

  y = drawSummaryCards(doc, pageW, y, [
    { label: 'Total Hutang', value: rp(totalDebt) },
    { label: 'Sudah Dibayar', value: rp(totalPaid) },
    { label: 'Sisa Hutang', value: rp(totalRemaining), highlight: true },
    { label: 'Jumlah Overdue', value: `${overdueCount} hutang` },
  ], ACCENT)

  y = drawSectionTitle(doc, y, 'RINCIAN DATA HUTANG', ACCENT)

  const cols      = ['No', 'Pelanggan', 'No. Telepon', 'Admin', 'Total Hutang', 'Sudah Dibayar', 'Sisa Hutang', 'Status', 'Jatuh Tempo', 'Tgl. Transaksi']
  const colWidths = [9, 38, 28, 28, 32, 32, 32, 22, 28, 30]

  y = drawTableHeader(doc, pageW, y, cols, colWidths, ACCENT)

  doc.setFont('helvetica', 'normal')
  debts.forEach((debt, idx) => {
    if (y > pageH - 22) {
      doc.addPage()
      y = drawTableHeader(doc, pageW, 15, cols, colWidths, ACCENT)
    }

    const isPaid    = debt.status === 'paid'
    const isOverdue = !isPaid && debt.due_date && new Date(debt.due_date) < new Date()
    const rowBg     = isPaid
      ? [240, 253, 244]
      : isOverdue ? [255, 241, 241]
      : idx % 2 === 0 ? [255, 255, 255] : [252, 252, 255]

    doc.setFillColor(...rowBg)
    doc.rect(14, y, pageW - 28, 8, 'F')

    // Garis merah kiri untuk overdue
    if (isOverdue) {
      doc.setFillColor(220, 38, 38)
      doc.rect(14, y, 1.5, 8, 'F')
    }

    doc.setFontSize(7.5)

    const statusLabel = { unpaid: 'Belum Lunas', partial: 'Sebagian', paid: 'Lunas' }
    const dueDate     = debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    const txDate      = debt.created_at ? new Date(debt.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    const adminName   = debt.admins?.full_name || '-'

    const rowData = [
      String(idx + 1),
      debt.customer_name,
      debt.customer_phone || '-',
      adminName,
      rp(debt.total_amount),
      rp(debt.paid_amount),
      rp(debt.remaining_amount),
      statusLabel[debt.status] || debt.status,
      dueDate,
      txDate,
    ]

    let x = 14
    rowData.forEach((cell, i) => {
      if (i === 7) {
        if (isPaid)                         doc.setTextColor(22, 163, 74)
        else if (debt.status === 'partial') doc.setTextColor(217, 119, 6)
        else                                doc.setTextColor(220, 38, 38)
        doc.setFont('helvetica', 'bold')
      } else if (i === 6) {
        if (isPaid) doc.setTextColor(22, 163, 74)
        else        doc.setTextColor(220, 38, 38)
        doc.setFont('helvetica', 'normal')
      } else {
        doc.setTextColor(isPaid ? 22 : 50, isPaid ? 101 : 50, isPaid ? 52 : 50)
        doc.setFont('helvetica', 'normal')
      }
      doc.text(String(cell), x + 3, y + 5.2)
      x += colWidths[i]
    })

    doc.setTextColor(50, 50, 50)
    doc.setDrawColor(220, 220, 230)
    doc.line(14, y + 8, pageW - 14, y + 8)
    y += 8
  })

  // Total row
  doc.setFillColor(255, 228, 228)
  doc.rect(14, y, pageW - 28, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ACCENT)
  doc.text('TOTAL KESELURUHAN', 17, y + 5.2)
  const tx = 14 + colWidths.slice(0, 4).reduce((a, b) => a + b, 0)
  doc.text(rp(totalDebt),      tx + 3,                      y + 5.2)
  doc.text(rp(totalPaid),      tx + colWidths[4] + 3,       y + 5.2)
  doc.text(rp(totalRemaining), tx + colWidths[4] + colWidths[5] + 3, y + 5.2)
  y += 12

  // Legend
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text('Keterangan warna:', 14, y)
  const legend = [
    { color: [240, 253, 244], label: 'Lunas' },
    { color: [255, 241, 241], label: 'Overdue (garis merah kiri)' },
    { color: [255, 255, 255], label: 'Belum Lunas / Sebagian' },
  ]
  let lx = 50
  legend.forEach(({ color, label }) => {
    doc.setFillColor(...color)
    doc.setDrawColor(180, 180, 180)
    doc.rect(lx, y - 3.5, 5, 4, 'FD')
    doc.setTextColor(100, 100, 100)
    doc.text(label, lx + 6.5, y)
    lx += label.length * 2 + 14
  })

  drawFooters(doc, pageW, pageH, ACCENT)
  doc.save(`laporan-hutang-${Date.now()}.pdf`)
}