import { createServerSupabase } from '../../../services/supabaseClient'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  const { id } = req.query
  const supabase = createServerSupabase()

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json({ message: 'Admin berhasil dihapus' })
  }

  if (req.method === 'PATCH') {
    const updates = { ...req.body }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10)
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', id)
      .select('id, username, full_name, role, is_active, created_at')
      .single()

    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
