// pages/api/setup/verify.js
// Endpoint ringan: hanya cek apakah kode rahasia benar
// Tidak mengembalikan data sensitif apapun

const SETUP_SECRET = 'adminbaik123'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { setupSecret } = req.body

  if (!setupSecret || setupSecret !== SETUP_SECRET) {
    return res.status(403).json({ message: 'Kode rahasia salah' })
  }

  return res.status(200).json({ ok: true })
}