import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Eye, EyeOff, Wifi, Lock, User, Loader2, Key, ChevronDown, ChevronUp, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  // Setup panel state
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState(1) // 1: kode rahasia, 2: pilih nama + buat akun, 3: sukses
  const [setupSecret, setSetupSecret] = useState('')
  const [secretError, setSecretError] = useState('')
  const [pendingAdmins, setPendingAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [successName, setSuccessName] = useState('')

  // Reset setup state saat panel ditutup
  function handleToggleSetup() {
    setShowSetup(prev => !prev)
    setSetupStep(1)
    setSetupSecret('')
    setSecretError('')
    setPendingAdmins([])
    setSelectedAdmin(null)
    setNewUsername('')
    setNewPassword('')
    setConfirmPassword('')
    setSetupError('')
  }

  // Step 1 → verifikasi kode & load pending admins
  async function handleSecretSubmit(e) {
    e.preventDefault()
    setSecretError('')

    if (!setupSecret.trim()) {
      setSecretError('Masukkan kode setup terlebih dahulu')
      return
    }

    setLoadingAdmins(true)
    try {
      // Verifikasi kode ke API dulu (ringan, tanpa data sensitif)
      const res = await fetch('/api/setup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupSecret }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSecretError(data.message || 'Kode salah')
        return
      }

      // Load pending admins (yang belum setup)
      const { data, error } = await supabase
        .from('admins')
        .select('id, full_name')
        .is('username', null)
        .eq('role', 'admin')
        .order('full_name')

      if (error) throw error

      if (!data || data.length === 0) {
        setSecretError('Semua admin sudah memiliki akun.')
        return
      }

      setPendingAdmins(data)
      setSetupStep(2)
    } catch (err) {
      setSecretError('Gagal menghubungi server')
    } finally {
      setLoadingAdmins(false)
    }
  }

  // Step 2 → simpan akun
  async function handleRegister(e) {
    e.preventDefault()
    setSetupError('')

    if (!selectedAdmin) { setSetupError('Pilih nama kamu'); return }
    if (newUsername.length < 3) { setSetupError('Username minimal 3 karakter'); return }
    if (newPassword.length < 6) { setSetupError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setSetupError('Konfirmasi password tidak cocok'); return }

    setSetupLoading(true)
    try {
      const res = await fetch('/api/setup/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: selectedAdmin.id,
          username: newUsername.toLowerCase().trim(),
          password: newPassword,
          setupSecret,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setSetupError(data.message || 'Terjadi kesalahan'); return }

      setSuccessName(selectedAdmin.full_name)
      setSetupStep(3)
    } catch {
      setSetupError('Gagal menghubungi server')
    } finally {
      setSetupLoading(false)
    }
  }

  // Login form submit
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Username dan password wajib diisi')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>WifiSekre.net</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-violet-500 flex items-center justify-center p-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/30">
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">WiFi Voucher</h1>
            <p className="text-white/70 text-sm mt-1">Masuk ke sistem manajemen</p>
          </div>

          {/* Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">

            {/* ── LOGIN FORM ── */}
            <div className="p-8">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-sm text-red-700 flex items-center gap-2">
                  <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-500 font-bold shrink-0">!</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="Masukkan username"
                      className="input pl-10"
                      autoComplete="username"
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Masukkan password"
                      className="input pl-10 pr-10"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn w-full btn-lg mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Memproses...</>
                  ) : 'Masuk'}
                </button>
              </form>
            </div>

            {/* ── DIVIDER + TOGGLE ── */}
            <div className="px-8 pb-2">
              <button
                type="button"
                onClick={handleToggleSetup}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-primary-600 transition-all border border-dashed border-gray-200 hover:border-primary-300"
              >
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Admin baru? Buat akun di sini
                </span>
                {showSetup
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* ── SETUP PANEL ── */}
            {showSetup && (
              <div className="px-8 pb-8 pt-4 border-t border-gray-100 mt-2">

                {/* Step 1: Kode rahasia */}
                {setupStep === 1 && (
                  <form onSubmit={handleSecretSubmit} className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Setup Akun Admin
                      </p>
                      <label className="label">Kode Rahasia</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="password"
                          value={setupSecret}
                          onChange={e => { setSetupSecret(e.target.value); setSecretError('') }}
                          placeholder="Masukkan kode dari superadmin"
                          className="input pl-10"
                        />
                      </div>
                      {secretError && (
                        <p className="text-red-500 text-xs mt-1.5">{secretError}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">
                        Hubungi superadmin untuk mendapatkan kode ini.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loadingAdmins}
                      className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loadingAdmins
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
                        : 'Verifikasi Kode'}
                    </button>
                  </form>
                )}

                {/* Step 2: Pilih nama + buat akun */}
                {setupStep === 2 && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => setSetupStep(1)}
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pilih Nama & Buat Akun
                      </p>
                    </div>

                    {/* Pilih nama */}
                    <div>
                      <label className="label">Nama kamu</label>
                      <div className="space-y-2">
                        {pendingAdmins.map(admin => (
                          <button
                            key={admin.id}
                            type="button"
                            onClick={() => setSelectedAdmin(admin)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-sm ${
                              selectedAdmin?.id === admin.id
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-primary-200 text-gray-700'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              selectedAdmin?.id === admin.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {admin.full_name.charAt(0)}
                            </div>
                            <span className="font-medium">{admin.full_name}</span>
                            {selectedAdmin?.id === admin.id && (
                              <CheckCircle className="w-4 h-4 text-primary-500 ml-auto shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Username baru */}
                    <div>
                      <label className="label">Buat Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          placeholder="Username untuk login"
                          className="input pl-10"
                        />
                      </div>
                    </div>

                    {/* Password baru */}
                    <div>
                      <label className="label">Buat Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 6 karakter"
                          className="input pl-10 pr-10"
                        />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi password */}
                    <div>
                      <label className="label">Konfirmasi Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className={`input pl-10 pr-10 ${
                            confirmPassword && confirmPassword !== newPassword
                              ? 'border-red-400 bg-red-50'
                              : confirmPassword && confirmPassword === newPassword
                              ? 'border-green-400 bg-green-50'
                              : ''
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {setupError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-xs text-red-600">{setupError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={setupLoading}
                      className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {setupLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                        : <><CheckCircle className="w-4 h-4" /> Aktivasi Akun</>}
                    </button>
                  </form>
                )}

                {/* Step 3: Sukses */}
                {setupStep === 3 && (
                  <div className="text-center py-2">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-7 h-7 text-green-500" />
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">Akun Aktif, {successName}! 🎉</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Gunakan username & password yang baru kamu buat untuk login.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSetup(false)
                        setSetupStep(1)
                      }}
                      className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition"
                    >
                      Login Sekarang
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 pb-6 px-8">
              WiFi Voucher Management System v1.0
            </p>
          </div>
        </div>
      </div>
    </>
  )
}