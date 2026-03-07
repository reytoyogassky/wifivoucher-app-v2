import { createServerSupabase } from '../../../services/supabaseClient'

export default async function handler(req, res) {
  const supabase = createServerSupabase()

  if (req.method === 'GET') {
    const { page = 1, limit = 20, startDate, endDate, adminId, paymentMethod, customerName } = req.query
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    let query = supabase
      .from('sales')
      .select(`
        *,
        admins(full_name, username),
        sale_items(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1)

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    if (adminId) query = query.eq('admin_id', adminId)
    if (paymentMethod) query = query.eq('payment_method', paymentMethod)
    if (customerName) query = query.ilike('customer_name', `%${customerName}%`)

    const { data, error, count } = await query
    if (error) return res.status(500).json({ message: error.message })

    return res.status(200).json({
      data,
      count,
      totalPages: Math.ceil(count / limitNum),
    })
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
