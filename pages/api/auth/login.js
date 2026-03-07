import { createServerSupabase } from '../../../services/supabaseClient'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' })
  }

  try {
    const supabase = createServerSupabase()

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !admin) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    const isValid = await bcrypt.compare(password, admin.password)
    if (!isValid) {
      return res.status(401).json({ message: 'Username atau password salah' })
    }

    // Return admin without password
    const { password: _, ...adminData } = admin

    return res.status(200).json({
      admin: adminData,
      message: 'Login berhasil',
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
