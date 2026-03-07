import { createServerSupabase } from '../../../services/supabaseClient'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  const supabase = createServerSupabase()

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ message: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { username, password, full_name, role } = req.body

    if (!username || !password || !full_name) {
      return res.status(400).json({ message: 'Data tidak lengkap' })
    }

    // Check username exists
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      return res.status(400).json({ message: 'Username sudah digunakan' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('admins')
      .insert({
        username: username.toLowerCase().trim(),
        password: hashedPassword,
        full_name: full_name.trim(),
        role: role || 'admin',
      })
      .select('id, username, full_name, role, is_active, created_at')
      .single()

    if (error) return res.status(500).json({ message: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ message: 'Method not allowed' })
}
