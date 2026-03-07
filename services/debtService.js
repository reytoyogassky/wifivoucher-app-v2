import { supabase } from './supabaseClient'

/**
 * Get all debts with filters
 */
export async function getDebts({
  page = 1,
  limit = 20,
  status,
  customerName,
  adminId,
  overdue,
} = {}) {
  let query = supabase
    .from('debts')
    .select(`
      *,
      admins(full_name, username),
      sales(transaction_code, created_at),
      debt_payments(id, amount, payment_date, created_at)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)
  if (customerName) query = query.ilike('customer_name', `%${customerName}%`)
  if (adminId) query = query.eq('admin_id', adminId)
  if (overdue) {
    const now = new Date().toISOString()
    query = query.lt('due_date', now).neq('status', 'paid')
  }

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, totalPages: Math.ceil(count / limit) }
}

/**
 * Get debt summary for dashboard
 */
export async function getDebtSummary() {
  const { data, error } = await supabase
    .from('debts')
    .select('total_amount, paid_amount, remaining_amount, status, due_date')

  if (error) throw error

  const now = new Date()
  const summary = {
    totalDebt: 0,
    totalPaid: 0,
    totalRemaining: 0,
    unpaidCount: 0,
    partialCount: 0,
    paidCount: 0,
    overdueCount: 0,
  }

  data.forEach(d => {
    summary.totalDebt += Number(d.total_amount)
    summary.totalPaid += Number(d.paid_amount)
    summary.totalRemaining += Number(d.remaining_amount)

    if (d.status === 'unpaid') summary.unpaidCount++
    if (d.status === 'partial') summary.partialCount++
    if (d.status === 'paid') summary.paidCount++

    if (d.status !== 'paid' && d.due_date && new Date(d.due_date) < now) {
      summary.overdueCount++
    }
  })

  return summary
}

/**
 * Get single debt detail
 */
export async function getDebtById(id) {
  const { data, error } = await supabase
    .from('debts')
    .select(`
      *,
      admins(full_name, username),
      sales(transaction_code),
      debt_payments(id, amount, payment_date, notes, created_at, admins(full_name))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Pay debt (full or partial)
 */
export async function payDebt({ debtId, adminId, amount, notes }) {
  // 1. Fetch current debt
  const { data: debt, error: fetchErr } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .single()

  if (fetchErr) throw fetchErr

  const newPaid = Number(debt.paid_amount) + Number(amount)
  const newRemaining = Number(debt.total_amount) - newPaid

  if (newPaid > Number(debt.total_amount)) {
    throw new Error('Jumlah pembayaran melebihi sisa hutang')
  }

  const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

  // 2. Create payment record
  const { error: payErr } = await supabase
    .from('debt_payments')
    .insert({
      debt_id: debtId,
      admin_id: adminId,
      amount: Number(amount),
      notes,
      payment_date: new Date().toISOString(),
    })

  if (payErr) throw payErr

  // 3. Update debt status
  const { data: updatedDebt, error: updateErr } = await supabase
    .from('debts')
    .update({
      paid_amount: newPaid,
      status: newStatus,
    })
    .eq('id', debtId)
    .select()
    .single()

  if (updateErr) throw updateErr

  return updatedDebt
}

/**
 * Get debts for PDF export
 */
export async function getDebtsForExport({ status, overdue } = {}) {
  let query = supabase
    .from('debts')
    .select(`
      *,
      admins(full_name),
      sales(transaction_code),
      debt_payments(amount, payment_date)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (overdue) {
    const now = new Date().toISOString()
    query = query.lt('due_date', now).neq('status', 'paid')
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Delete debts by IDs
 */
export async function deleteDebtsBulk(ids) {
  const { error } = await supabase.from('debts').delete().in('id', ids)
  if (error) throw error
  return true
}

/**
 * Delete debts by status
 */
export async function deleteDebtsByStatus(status) {
  const { error } = await supabase.from('debts').delete().eq('status', status)
  if (error) throw error
  return true
}

/**
 * Delete all debts
 */
export async function deleteAllDebts() {
  const { error } = await supabase.from('debts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
  return true
}