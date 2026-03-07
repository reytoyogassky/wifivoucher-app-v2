import { createServerSupabase } from '../../../services/supabaseClient'

export default async function handler(req, res) {
  const supabase = createServerSupabase()

  if (req.method === 'GET') {
    const { status = 'available' } = req.query

    let query = supabase.from('vouchers').select('*').order('price', { ascending: true })
    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { code, package_name, duration, speed, price, cost_price } = req.body
    if (!code || !package_name || !duration || !price) {
      return res.status(400).json({ message: 'Data tidak lengkap' })
    }
    const { data, error } = await supabase
      .from('vouchers')
      .insert({ code, package_name, duration, speed, price, cost_price })
      .select()
      .single()

    if (error) return res.status(500).json({ message: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
