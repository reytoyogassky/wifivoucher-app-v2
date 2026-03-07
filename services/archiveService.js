import { supabase } from './supabaseClient'

/**
 * Preview data yang akan diarsipkan (sebelum tutup buku)
 */
export async function previewClosingData({ startDate, endDate }) {
  // 1. Sales dalam periode
  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select(`
      *,
      admins(full_name),
      sale_items(voucher_code, package_name, price, voucher_id,
        vouchers(cost_price))
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (sErr) throw sErr

  // 2. Hutang paid dalam periode
  const { data: paidDebts, error: dErr } = await supabase
    .from('debts')
    .select('*')
    .eq('status', 'paid')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (dErr) throw dErr

  // 3. Hutang aktif (unpaid/partial) - dibawa ke bulan depan
  const { data: activeDebts, error: adErr } = await supabase
    .from('debts')
    .select('*')
    .in('status', ['unpaid', 'partial'])

  if (adErr) throw adErr

  // Hitung statistik
  const cashRevenue     = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_amount), 0)
  const debtPaidRevenue = paidDebts.reduce((sum, d) => sum + Number(d.paid_amount), 0)
  const totalRevenue    = cashRevenue + debtPaidRevenue
  const totalNewDebt    = activeDebts.reduce((sum, d) => sum + Number(d.remaining_amount), 0)

  // Total voucher terjual & profit
  const allItems = sales.flatMap(s => s.sale_items || [])
  const totalVouchersSold = allItems.length
  const totalProfit = allItems.reduce((sum, item) => {
    const cost = Number(item.vouchers?.cost_price || 0)
    return sum + (Number(item.price) - cost)
  }, 0)

  // Performa per admin
  const adminMap = {}
  sales.forEach(sale => {
    const aid  = sale.admin_id || 'unknown'
    const name = sale.admins?.full_name || 'Unknown'
    if (!adminMap[aid]) adminMap[aid] = { admin_id: aid, admin_name: name, total_sales: 0, total_revenue: 0, cash_revenue: 0, debt_revenue: 0, total_profit: 0 }
    adminMap[aid].total_sales++
    adminMap[aid].total_revenue += Number(sale.total_amount)
    if (sale.payment_method === 'cash') adminMap[aid].cash_revenue += Number(sale.total_amount)
    else adminMap[aid].debt_revenue += Number(sale.total_amount)
    const itemProfit = (sale.sale_items || []).reduce((sum, item) => sum + (Number(item.price) - Number(item.vouchers?.cost_price || 0)), 0)
    adminMap[aid].total_profit += itemProfit
  })

  return {
    totalTransactions: sales.length,
    totalVouchersSold,
    cashRevenue,
    debtPaidRevenue,
    totalRevenue,
    totalNewDebt,
    totalProfit,
    adminPerformance: Object.values(adminMap),
    salesCount: sales.length,
    paidDebtsCount: paidDebts.length,
    activeDebtsCount: activeDebts.length,
    // raw data untuk archiving
    _sales: sales,
    _paidDebts: paidDebts,
    _allItems: allItems,
  }
}

/**
 * Eksekusi tutup buku: arsipkan lalu hapus data
 */
export async function executeClosing({ periodLabel, startDate, endDate, closedBy, preview }) {
  const { _sales, _paidDebts, _allItems, _adminPerformance, ...stats } = preview
  const adminPerformance = preview.adminPerformance

  // 1. Insert monthly_archives
  const { data: archive, error: archErr } = await supabase
    .from('monthly_archives')
    .insert({
      period_label:       periodLabel,
      period_start:       startDate,
      period_end:         endDate,
      total_revenue:      preview.totalRevenue,
      cash_revenue:       preview.cashRevenue,
      debt_paid_revenue:  preview.debtPaidRevenue,
      total_new_debt:     preview.totalNewDebt,
      total_transactions: preview.totalTransactions,
      total_vouchers_sold: preview.totalVouchersSold,
      total_profit:       preview.totalProfit,
      closed_by:          closedBy,
    })
    .select()
    .single()

  if (archErr) throw archErr
  const archiveId = archive.id

  // 2. Insert archive_admin_performance
  if (adminPerformance.length > 0) {
    const perfRows = adminPerformance.map(a => ({ archive_id: archiveId, ...a }))
    const { error: perfErr } = await supabase.from('archive_admin_performance').insert(perfRows)
    if (perfErr) throw perfErr
  }

  // 3. Insert archive_sale_details
  if (_allItems.length > 0) {
    // Build lookup: sale_id → { customer_name, payment_method, created_at, admin_name }
    const saleMap = {}
    preview._sales.forEach(s => {
      saleMap[s.id] = {
        customer_name:  s.customer_name,
        payment_method: s.payment_method,
        sold_at:        s.created_at,
        admin_name:     s.admins?.full_name || '-',
      }
    })

    const detailRows = preview._sales.flatMap(sale =>
      (sale.sale_items || []).map(item => ({
        archive_id:     archiveId,
        voucher_code:   item.voucher_code,
        package_name:   item.package_name,
        price:          Number(item.price),
        cost_price:     Number(item.vouchers?.cost_price || 0),
        customer_name:  sale.customer_name,
        payment_method: sale.payment_method,
        sold_at:        sale.created_at,
        admin_name:     sale.admins?.full_name || '-',
      }))
    )

    if (detailRows.length > 0) {
      // Batch insert 100
      for (let i = 0; i < detailRows.length; i += 100) {
        const { error: detErr } = await supabase.from('archive_sale_details').insert(detailRows.slice(i, i + 100))
        if (detErr) throw detErr
      }
    }
  }

  // 4. Hapus sales dalam periode (cascade ke sale_items)
  if (preview._sales.length > 0) {
    const saleIds = preview._sales.map(s => s.id)
    for (let i = 0; i < saleIds.length; i += 100) {
      const { error: delSaleErr } = await supabase.from('sales').delete().in('id', saleIds.slice(i, i + 100))
      if (delSaleErr) throw delSaleErr
    }
  }

  // 5. Hapus hutang paid dalam periode
  if (preview._paidDebts.length > 0) {
    const debtIds = preview._paidDebts.map(d => d.id)
    for (let i = 0; i < debtIds.length; i += 100) {
      const { error: delDebtErr } = await supabase.from('debts').delete().in('id', debtIds.slice(i, i + 100))
      if (delDebtErr) throw delDebtErr
    }
  }

  return archive
}

/**
 * Get semua arsip (list)
 */
export async function getArchives() {
  const { data, error } = await supabase
    .from('monthly_archives')
    .select(`*, admins(full_name)`)
    .order('period_start', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get detail satu arsip
 */
export async function getArchiveDetail(id) {
  const { data: archive, error } = await supabase
    .from('monthly_archives')
    .select(`*, admins(full_name)`)
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: adminPerf, error: apErr } = await supabase
    .from('archive_admin_performance')
    .select('*')
    .eq('archive_id', id)
    .order('total_revenue', { ascending: false })

  if (apErr) throw apErr

  const { data: saleDetails, error: sdErr } = await supabase
    .from('archive_sale_details')
    .select('*')
    .eq('archive_id', id)
    .order('sold_at', { ascending: false })

  if (sdErr) throw sdErr

  return { archive, adminPerf, saleDetails }
}