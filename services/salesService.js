import { supabase } from './supabaseClient'
import { markVouchersAsSold } from './voucherService'

/**
 * Create a new sale transaction
 */
export async function createSale({ adminId, customerName, customerPhone, paymentMethod, voucherIds, notes }) {
  // 1. Fetch selected vouchers
  const { data: vouchers, error: vErr } = await supabase
    .from('vouchers')
    .select('*')
    .in('id', voucherIds)
    .eq('status', 'available')

  if (vErr) throw vErr
  if (vouchers.length !== voucherIds.length) {
    throw new Error('Beberapa voucher sudah tidak tersedia')
  }

  const totalAmount = vouchers.reduce((sum, v) => sum + Number(v.price), 0)

  // 2. Create sale record
  const { data: sale, error: sErr } = await supabase
    .from('sales')
    .insert({
      admin_id: adminId,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      payment_method: paymentMethod,
      total_amount: totalAmount,
      paid_amount: paymentMethod === 'cash' ? totalAmount : 0,
      notes,
    })
    .select()
    .single()

  if (sErr) throw sErr

  // 3. Create sale items
  const saleItems = vouchers.map(v => ({
    sale_id: sale.id,
    voucher_id: v.id,
    voucher_code: v.code,
    package_name: v.package_name,
    price: v.price,
  }))

  const { error: siErr } = await supabase
    .from('sale_items')
    .insert(saleItems)

  if (siErr) throw siErr

  // 4. Mark vouchers as sold
  await markVouchersAsSold(voucherIds)

  // 5. Create debt record if payment method is debt
  if (paymentMethod === 'debt') {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const { error: dErr } = await supabase
      .from('debts')
      .insert({
        sale_id: sale.id,
        admin_id: adminId,
        customer_name: customerName,
        customer_phone: customerPhone,
        total_amount: totalAmount,
        paid_amount: 0,
        status: 'unpaid',
        due_date: dueDate.toISOString(),
      })

    if (dErr) throw dErr

    // 6. Kirim WA konfirmasi hutang (fire-and-forget, tidak hentikan transaksi)
    if (customerPhone) {
      try {
        await fetch('/api/whatsapp/send-new-debt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            customerPhone,
            totalAmount,
            dueDate:         dueDate.toISOString(),
            transactionCode: sale.transaction_code || sale.id.slice(0, 8),
            items:           vouchers.map(v => ({
              package_name: v.package_name,
              voucher_code: v.code,
            })),
          }),
        })
      } catch { /* WA gagal tidak batalkan transaksi */ }
    }
  }

  return { sale, vouchers }
}

/**
 * Get sales with filters and pagination
 */
export async function getSales({
  page = 1,
  limit = 20,
  startDate,
  endDate,
  adminId,
  paymentMethod,
  customerName,
} = {}) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      admins(full_name, username),
      sale_items(*)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  if (adminId) query = query.eq('admin_id', adminId)
  if (paymentMethod) query = query.eq('payment_method', paymentMethod)
  if (customerName) query = query.ilike('customer_name', `%${customerName}%`)

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, totalPages: Math.ceil(count / limit) }
}

/**
 * Get sales summary (for dashboard)
 */
export async function getSalesSummary(startDate, endDate) {
  let query = supabase
    .from('sales')
    .select('total_amount, payment_method, paid_amount')

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data, error } = await query
  if (error) throw error

  const summary = {
    totalTransactions: data.length,
    totalRevenue: 0,
    cashRevenue: 0,
    debtRevenue: 0,
    totalProfit: 0,
  }

  data.forEach(s => {
    summary.totalRevenue += Number(s.total_amount)
    if (s.payment_method === 'cash') {
      summary.cashRevenue += Number(s.total_amount)
      summary.totalProfit += Number(s.total_amount)
    } else {
      summary.debtRevenue += Number(s.total_amount)
    }
  })

  // Tambah hutang yang dibayar (paid_amount dari debt_payments) dalam periode
  let dpQuery = supabase
    .from('debt_payments')
    .select('amount')
  if (startDate) dpQuery = dpQuery.gte('created_at', startDate)
  if (endDate) dpQuery = dpQuery.lte('created_at', endDate)
  const { data: payments, error: dpErr } = await dpQuery
  if (!dpErr && payments) {
    payments.forEach(p => { summary.totalProfit += Number(p.amount) })
  }

  return summary
}

/**
 * Get sale detail with items
 */
export async function getSaleById(id) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      admins(full_name, username),
      sale_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all sales for PDF export (no pagination)
 */
export async function getSalesForExport({ startDate, endDate, adminId, paymentMethod } = {}) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      admins(full_name, username),
      sale_items(voucher_code, package_name, price, vouchers(cost_price)),
      debts(id, status, paid_amount, remaining_amount, total_amount, debt_payments(amount, created_at))
    `)
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  if (adminId) query = query.eq('admin_id', adminId)
  if (paymentMethod) query = query.eq('payment_method', paymentMethod)

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Delete sales by IDs
 */
export async function deleteSalesBulk(ids) {
  const { error } = await supabase.from('sales').delete().in('id', ids)
  if (error) throw error
  return true
}

/**
 * Delete all sales
 */
export async function deleteAllSales() {
  const { error } = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
  return true
}
/**
 * Get unique customers with their active debt info
 * Used for autocomplete on sell page
 */
export async function getCustomersWithDebt() {
  const { data, error } = await supabase
    .from('sales')
    .select('customer_name, customer_phone')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Deduplicate by customer_name
  const seen = new Set()
  const customers = []
  for (const s of data) {
    if (!seen.has(s.customer_name)) {
      seen.add(s.customer_name)
      customers.push({ name: s.customer_name, phone: s.customer_phone || '' })
    }
  }

  // Fetch active debts for each customer
  const { data: debts, error: dErr } = await supabase
    .from('debts')
    .select('customer_name, customer_phone, id, remaining_amount, total_amount, status')
    .in('status', ['unpaid', 'partial'])
    .order('created_at', { ascending: false })

  if (dErr) throw dErr

  // Merge debt info into customers
  const debtMap = {}
  for (const d of debts) {
    if (!debtMap[d.customer_name]) {
      debtMap[d.customer_name] = { id: d.id, remaining: Number(d.remaining_amount), status: d.status }
    } else {
      // Sum up all active debts for the same customer
      debtMap[d.customer_name].remaining += Number(d.remaining_amount)
    }
  }

  return customers.map(c => ({
    ...c,
    activeDebt: debtMap[c.name] || null,
  }))
}

/**
 * Add new voucher purchase to existing debt
 */
export async function addToExistingDebt({ debtId, adminId, voucherIds, customerName, customerPhone, notes }) {
  // 1. Fetch vouchers
  const { data: vouchers, error: vErr } = await supabase
    .from('vouchers')
    .select('*')
    .in('id', voucherIds)
    .eq('status', 'available')

  if (vErr) throw vErr
  if (vouchers.length !== voucherIds.length) throw new Error('Beberapa voucher sudah tidak tersedia')

  const addAmount = vouchers.reduce((sum, v) => sum + Number(v.price), 0)

  // 2. Create new sale record (payment_method = debt)
  const { data: sale, error: sErr } = await supabase
    .from('sales')
    .insert({
      admin_id: adminId,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      payment_method: 'debt',
      total_amount: addAmount,
      paid_amount: 0,
      notes,
    })
    .select()
    .single()

  if (sErr) throw sErr

  // 3. Sale items
  const saleItems = vouchers.map(v => ({
    sale_id: sale.id,
    voucher_id: v.id,
    voucher_code: v.code,
    package_name: v.package_name,
    price: v.price,
  }))
  const { error: siErr } = await supabase.from('sale_items').insert(saleItems)
  if (siErr) throw siErr

  // 4. Mark vouchers sold
  const { error: vuErr } = await supabase.from('vouchers').update({ status: 'sold' }).in('id', voucherIds)
  if (vuErr) throw vuErr

  // 5. Update existing debt: tambah total_amount
  const { data: existingDebt, error: debtFetchErr } = await supabase
    .from('debts').select('total_amount, paid_amount').eq('id', debtId).single()
  if (debtFetchErr) throw debtFetchErr

  const newTotal = Number(existingDebt.total_amount) + addAmount
  const newStatus = Number(existingDebt.paid_amount) === 0 ? 'unpaid' : 'partial'

  const { error: debtUpdErr } = await supabase
    .from('debts')
    .update({ total_amount: newTotal, status: newStatus })
    .eq('id', debtId)
  if (debtUpdErr) throw debtUpdErr

  return { sale, vouchers }
}
/**
 * Get sales chart data grouped by hour (today) or day (week/month)
 */

/**
 * Get sales chart data grouped by hour (today) or day (week/month)
 * profit = cash sales + debt payments received in the period
 */
export async function getSalesChartData(startDate, endDate, groupBy = 'day') {
  let salesQuery = supabase
    .from('sales')
    .select('created_at, total_amount, payment_method')
    .order('created_at', { ascending: true })
  if (startDate) salesQuery = salesQuery.gte('created_at', startDate)
  if (endDate)   salesQuery = salesQuery.lte('created_at', endDate)

  let dpQuery = supabase
    .from('debt_payments')
    .select('created_at, amount')
    .order('created_at', { ascending: true })
  if (startDate) dpQuery = dpQuery.gte('created_at', startDate)
  if (endDate)   dpQuery = dpQuery.lte('created_at', endDate)

  const [{ data: salesData, error: sErr }, { data: dpData, error: dpErr }] = await Promise.all([salesQuery, dpQuery])
  if (sErr) throw sErr

  const map = {}

  if (groupBy === 'hour') {
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, '0')}:00`
      map[label] = { label, revenue: 0, transactions: 0, cash: 0, debt: 0, profit: 0 }
    }
  } else {
    const start = new Date(startDate)
    const end   = new Date(endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      map[label] = { label, revenue: 0, transactions: 0, cash: 0, debt: 0, profit: 0 }
    }
  }

  const toLabel = (iso) => {
    const dt = new Date(iso)
    return groupBy === 'hour'
      ? `${String(dt.getHours()).padStart(2, '0')}:00`
      : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }

  salesData.forEach(s => {
    const label = toLabel(s.created_at)
    if (!map[label]) map[label] = { label, revenue: 0, transactions: 0, cash: 0, debt: 0, profit: 0 }
    map[label].revenue      += Number(s.total_amount)
    map[label].transactions += 1
    if (s.payment_method === 'cash') {
      map[label].cash   += Number(s.total_amount)
      map[label].profit += Number(s.total_amount)
    } else {
      map[label].debt += Number(s.total_amount)
    }
  })

  if (!dpErr && dpData) {
    dpData.forEach(p => {
      const label = toLabel(p.created_at)
      if (!map[label]) map[label] = { label, revenue: 0, transactions: 0, cash: 0, debt: 0, profit: 0 }
      map[label].profit += Number(p.amount)
    })
  }

  return Object.values(map)
}