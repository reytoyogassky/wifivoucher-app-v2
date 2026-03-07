import Head from 'next/head'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Shield, User, Eye, EyeOff, Search } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import withAuth from '../components/layout/withAuth'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import { TableSkeleton } from '../components/ui/Skeleton'
import { formatDateTime } from '../utils/formatDate'
import { useAuth } from '../context/AuthContext'
import { logActivity, LOG_ACTIONS } from '../services/logService'
import { useNotifications } from '../context/NotificationContext'

function AdminsPage() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const { admin: currentAdmin } = useAuth()
  const { addToast } = useNotifications()

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const res = await fetch('/api/admins')
      const data = await res.json()
      setAdmins(data)
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal memuat admin', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admins/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.message)
      }
      logActivity({
        adminId: currentAdmin.id, adminName: currentAdmin.full_name,
        action: LOG_ACTIONS.ADMIN_DELETE,
        description: `Menghapus admin "${confirmDelete.full_name}" (@${confirmDelete.username})`,
        metadata: { deletedAdminId: confirmDelete.id, deletedAdminName: confirmDelete.full_name },
      })
      setAdmins(prev => prev.filter(a => a.id !== confirmDelete.id))
      addToast({ type: 'success', title: 'Admin berhasil dihapus' })
      setConfirmDelete(null)
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal hapus', message: err.message })
    } finally {
      setDeleting(false)
    }
  }

  const filtered = admins.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Head><title>WifiSekre.net</title></Head>

      <div className="max-w-4xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari admin..."
              className="input pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Tambah Admin
          </button>
        </div>

        <div className="card !p-0 overflow-hidden">
          {loading ? (
            <div className="p-4"><TableSkeleton rows={4} cols={5} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-sm">Tidak ada admin ditemukan</p>
            </div>
          ) : (
            <div className="table-container rounded-none border-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {a.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{a.full_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-gray-600 dark:text-gray-300">@{a.username}</td>
                      <td>
                        <Badge variant={a.role === 'superadmin' ? 'purple' : 'gray'}>
                          {a.role === 'superadmin' ? (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Super Admin
                            </span>
                          ) : 'Admin'}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={a.is_active ? 'green' : 'red'} dot>
                          {a.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="text-xs text-gray-400">{formatDateTime(a.created_at)}</td>
                      <td>
                        {a.id !== currentAdmin.id && a.role !== 'superadmin' && (
                          <button
                            onClick={() => setConfirmDelete(a)}
                            className="btn btn-sm !px-2 text-red-500 hover:bg-red-50 border-red-200 hover:border-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {a.id === currentAdmin.id && (
                          <span className="text-xs text-gray-400 italic">Anda</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Admin Modal */}
      <AddAdminModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(newAdmin) => {
          logActivity({
            adminId: currentAdmin.id, adminName: currentAdmin.full_name,
            action: LOG_ACTIONS.ADMIN_CREATE,
            description: `Menambahkan admin baru "${newAdmin.full_name}" (@${newAdmin.username})`,
            metadata: { newAdminId: newAdmin.id, newAdminName: newAdmin.full_name, role: newAdmin.role },
          })
          setAdmins(prev => [newAdmin, ...prev])
          setShowAdd(false)
          addToast({ type: 'success', title: 'Admin berhasil ditambahkan!' })
        }}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Admin"
        message={`Yakin ingin menghapus admin "${confirmDelete?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Admin"
      />
    </>
  )
}

function AddAdminModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'admin' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username wajib diisi'
    if (!form.password || form.password.length < 6) errs.password = 'Password minimal 6 karakter'
    if (!form.full_name.trim()) errs.full_name = 'Nama lengkap wajib diisi'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      onSuccess(data)
      setForm({ username: '', password: '', full_name: '', role: 'admin' })
    } catch (err) {
      setErrors(p => ({ ...p, submit: err.message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Admin Baru"
      size="sm"
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1" disabled={loading}>Batal</button>
          <button onClick={handleSubmit} className="btn btn-primary flex-1" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Tambah Admin'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{errors.submit}</div>
        )}
        <div>
          <label className="label dark:text-gray-300">Nama Lengkap <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => { setForm(p => ({ ...p, full_name: e.target.value })); setErrors(p => ({ ...p, full_name: '' })) }}
            className={`input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${errors.full_name ? 'input-error' : ''}`}
            placeholder="Nama lengkap admin"
          />
          {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
        </div>
        <div>
          <label className="label dark:text-gray-300">Username <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.username}
            onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setErrors(p => ({ ...p, username: '' })) }}
            className={`input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${errors.username ? 'input-error' : ''}`}
            placeholder="username"
          />
          {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
        </div>
        <div>
          <label className="label dark:text-gray-300">Password <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })) }}
              className={`input pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${errors.password ? 'input-error' : ''}`}
              placeholder="Min. 6 karakter"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
        </div>
        <div>
          <label className="label dark:text-gray-300">Role</label>
          <select
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            className="input dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
      </div>
    </Modal>
  )
}

AdminsPage.getLayout = (page) => <AppLayout>{page}</AppLayout>
export default withAuth(AdminsPage, { superadminOnly: true })