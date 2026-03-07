import { supabase } from './supabaseClient'

/**
 * Fetch all admins
 */
export async function getAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('id, username, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Fetch single admin by ID
 */
export async function getAdminById(id) {
  const { data, error } = await supabase
    .from('admins')
    .select('id, username, full_name, role, is_active, created_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new admin (called from API route to hash password)
 */
export async function createAdmin(payload) {
  const { data, error } = await supabase
    .from('admins')
    .insert(payload)
    .select('id, username, full_name, role, is_active, created_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Update admin
 */
export async function updateAdmin(id, updates) {
  const { data, error } = await supabase
    .from('admins')
    .update(updates)
    .eq('id', id)
    .select('id, username, full_name, role, is_active, created_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Soft delete admin (set is_active = false)
 */
export async function deactivateAdmin(id) {
  const { data, error } = await supabase
    .from('admins')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Hard delete admin
 */
export async function deleteAdmin(id) {
  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

/**
 * Get admin performance stats
 */
export async function getAdminPerformance(startDate, endDate) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      admin_id,
      total_amount,
      payment_method,
      created_at,
      admins!inner(full_name, username)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  if (error) throw error

  // Aggregate by admin
  const performance = {}
  data.forEach(sale => {
    const aid = sale.admin_id
    if (!performance[aid]) {
      performance[aid] = {
        admin_id: aid,
        full_name: sale.admins.full_name,
        username: sale.admins.username,
        total_sales: 0,
        total_revenue: 0,
        cash_revenue: 0,
        debt_count: 0,
      }
    }
    performance[aid].total_sales += 1
    performance[aid].total_revenue += Number(sale.total_amount)
    if (sale.payment_method === 'cash') {
      performance[aid].cash_revenue += Number(sale.total_amount)
    } else {
      performance[aid].debt_count += 1
    }
  })

  return Object.values(performance).sort((a, b) => b.total_revenue - a.total_revenue)
}
