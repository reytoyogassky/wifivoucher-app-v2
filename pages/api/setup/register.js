import { createServerSupabase } from '../../../services/supabaseClient'
import bcrypt from 'bcryptjs'

// Kode rahasia setup — GANTI dengan string acak yang kamu bagikan ke 5 admin
// Simpan juga di .env.local sebagai SETUP_SECRET
const SETUP_SECRET = process.env.SETUP_SECRET  // contoh, ganti dengan yang lebih aman di produksi

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { adminId, username, password, setupSecret } = req.body

  // 1. Validasi kode rahasia
  if (setupSecret !== SETUP_SECRET) {
    return res.status(403).json({ message: 'Kode setup tidak valid' })
  }

  // 2. Validasi input
  if (!adminId || !username || !password) {
    return res.status(400).json({ message: 'Semua field wajib diisi' })
  }

  if (username.length < 3) {
    return res.status(400).json({ message: 'Username minimal 3 karakter' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password minimal 6 karakter' })
  }

  const cleanUsername = username.toLowerCase().trim()

  try {
    const supabase = createServerSupabase()

    // 3. Pastikan admin ini memang pending (belum punya username)
    const { data: targetAdmin, error: findError } = await supabase
      .from('admins')
      .select('id, full_name, username, is_active')
      .eq('id', adminId)
      .is('username', null)
      .single()

    if (findError || !targetAdmin) {
      return res.status(400).json({ message: 'Admin tidak ditemukan atau sudah melakukan setup' })
    }

    // 4. Cek username tidak bentrok dengan yang sudah ada
    const { data: existing } = await supabase
      .from('admins')
      .select('id')
      .eq('username', cleanUsername)
      .single()

    if (existing) {
      return res.status(409).json({ message: 'Username sudah dipakai, pilih yang lain' })
    }

    // 5. Hash password & simpan
    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: updateError } = await supabase
      .from('admins')
      .update({
        username: cleanUsername,
        password: hashedPassword,
        is_active: true,
      })
      .eq('id', adminId)

    if (updateError) throw updateError

    return res.status(200).json({
      message: `Setup berhasil! Selamat datang, ${targetAdmin.full_name}. Silakan login.`,
    })
  } catch (err) {
    console.error('Setup register error:', err)
    return res.status(500).json({ message: 'Internal server error: ' + err.message })
  }
}