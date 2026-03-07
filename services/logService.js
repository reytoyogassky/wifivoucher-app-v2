import { supabase } from './supabaseClient'

/**
 * Kode aksi yang dicatat — tambah sesuai kebutuhan
 */
export const LOG_ACTIONS = {
  // Auth
  LOGIN:           'LOGIN',
  LOGOUT:          'LOGOUT',

  // Penjualan
  SELL:            'SELL',
  SALE_DELETE:     'SALE_DELETE',
  SALE_DELETE_ALL: 'SALE_DELETE_ALL',

  // Hutang
  DEBT_CREATE:     'DEBT_CREATE',
  DEBT_PAY:        'DEBT_PAY',
  DEBT_PAY_FULL:   'DEBT_PAY_FULL',

  // Voucher
  VOUCHER_UPLOAD:  'VOUCHER_UPLOAD',
  VOUCHER_DELETE:  'VOUCHER_DELETE',
  VOUCHER_BULK_DELETE: 'VOUCHER_BULK_DELETE',

  // Admin
  ADMIN_CREATE:    'ADMIN_CREATE',
  ADMIN_DELETE:    'ADMIN_DELETE',

  // Arsip
  ARCHIVE_CREATE:  'ARCHIVE_CREATE',
}

/**
 * Catat aktivitas admin ke tabel admin_logs.
 * Fire-and-forget — tidak melempar error agar tidak ganggu operasi utama.
 *
 * @param {object} params
 * @param {string} params.adminId   - UUID admin yang melakukan aksi
 * @param {string} params.adminName - Nama admin
 * @param {string} params.action    - Kode aksi dari LOG_ACTIONS
 * @param {string} params.description - Deskripsi singkat dalam bahasa Indonesia
 * @param {object} [params.metadata] - Data tambahan (opsional)
 */
export async function logActivity({ adminId, adminName, action, description, metadata = {} }) {
  try {
    await supabase.from('admin_logs').insert({
      admin_id:    adminId,
      admin_name:  adminName,
      action,
      description,
      metadata,
    })
  } catch (err) {
    // Jangan biarkan error log menghentikan operasi utama
    console.warn('[logActivity] Gagal mencatat log:', err.message)
  }
}

/**
 * Ambil log dengan filter & pagination
 */
export async function getLogs({
  page       = 1,
  limit      = 50,
  adminId,
  action,
  startDate,
  endDate,
} = {}) {
  let query = supabase
    .from('admin_logs')
    .select('*, admins(full_name, username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (adminId)   query = query.eq('admin_id', adminId)
  if (action)    query = query.eq('action', action)
  if (startDate) query = query.gte('created_at', startDate)
  if (endDate)   query = query.lte('created_at', endDate)

  const { data, error, count } = await query
  if (error) throw error

  return { data, count, totalPages: Math.ceil(count / limit) }
}