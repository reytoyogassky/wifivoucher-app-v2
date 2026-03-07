import { supabase } from './supabaseClient'

/**
 * Get all available vouchers
 */
export async function getAvailableVouchers() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('status', 'available')
    .order('price', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Get all vouchers with pagination
 */
export async function getVouchers({ page = 1, limit = 20, status, search } = {}) {
  let query = supabase
    .from('vouchers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('code', `%${search}%`)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count, totalPages: Math.ceil(count / limit) }
}

/**
 * Get voucher by ID
 */
export async function getVoucherById(id) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Get vouchers by IDs
 */
export async function getVouchersByIds(ids) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .in('id', ids)

  if (error) throw error
  return data
}

/**
 * Create voucher
 */
export async function createVoucher(payload) {
  const { data, error } = await supabase
    .from('vouchers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Bulk create vouchers
 */
export async function createVouchersBulk(vouchers, adminId = null) {
  const rows = vouchers.map(v => ({ ...v, ...(adminId ? { created_by: adminId } : {}) }))
  const { data, error } = await supabase
    .from('vouchers')
    .insert(rows)
    .select()

  if (error) throw error
  return data
}

/**
 * Update voucher status
 */
export async function updateVoucherStatus(id, status) {
  const { data, error } = await supabase
    .from('vouchers')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark multiple vouchers as sold
 */
export async function markVouchersAsSold(ids) {
  const { error } = await supabase
    .from('vouchers')
    .update({ status: 'sold' })
    .in('id', ids)

  if (error) throw error
  return true
}

/**
 * Delete voucher
 */
export async function deleteVoucher(id) {
  const { error } = await supabase
    .from('vouchers')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

/**
 * Bulk delete vouchers by IDs
 */
export async function deleteVouchersBulk(ids) {
  const { error } = await supabase
    .from('vouchers')
    .delete()
    .in('id', ids)

  if (error) throw error
  return true
}

/**
 * Delete all vouchers by status
 */
export async function deleteVouchersByStatus(status) {
  const { error } = await supabase
    .from('vouchers')
    .delete()
    .eq('status', status)

  if (error) throw error
  return true
}

/**
 * Get voucher statistics (direct query - RLS disabled)
 */
export async function getVoucherStats() {
  const { data, error } = await supabase
    .from('vouchers')
    .select('status')

  if (error) throw error

  const stats = { available: 0, sold: 0, expired: 0, reserved: 0, total: 0 }
  data.forEach(v => {
    stats[v.status] = (stats[v.status] || 0) + 1
    stats.total += 1
  })
  return stats
}