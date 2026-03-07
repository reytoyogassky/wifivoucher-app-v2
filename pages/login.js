import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Eye, EyeOff, Wifi, Lock, User, Loader2, Key, ChevronDown, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState(1)
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

  function handleToggleSetup() {
    setShowSetup(prev => !prev)
    setSetupStep(1); setSetupSecret(''); setSecretError('')
    setPendingAdmins([]); setSelectedAdmin(null)
    setNewUsername(''); setNewPassword(''); setConfirmPassword(''); setSetupError('')
  }

  async function handleSecretSubmit(e) {
    e.preventDefault(); setSecretError('')
    if (!setupSecret.trim()) { setSecretError('Masukkan kode setup terlebih dahulu'); return }
    setLoadingAdmins(true)
    try {
      const res = await fetch('/api/setup/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setupSecret }) })
      if (!res.ok) { const data = await res.json(); setSecretError(data.message || 'Kode salah'); return }
      const { data, error } = await supabase.from('admins').select('id, full_name').is('username', null).eq('role', 'admin').order('full_name')
      if (error) throw error
      if (!data || data.length === 0) { setSecretError('Semua admin sudah memiliki akun.'); return }
      setPendingAdmins(data); setSetupStep(2)
    } catch { setSecretError('Gagal menghubungi server') }
    finally { setLoadingAdmins(false) }
  }

  async function handleRegister(e) {
    e.preventDefault(); setSetupError('')
    if (!selectedAdmin) { setSetupError('Pilih nama kamu'); return }
    if (newUsername.length < 3) { setSetupError('Username minimal 3 karakter'); return }
    if (newPassword.length < 6) { setSetupError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setSetupError('Konfirmasi password tidak cocok'); return }
    setSetupLoading(true)
    try {
      const res = await fetch('/api/setup/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: selectedAdmin.id, username: newUsername.toLowerCase().trim(), password: newPassword, setupSecret }) })
      const data = await res.json()
      if (!res.ok) { setSetupError(data.message || 'Terjadi kesalahan'); return }
      setSuccessName(selectedAdmin.full_name); setSetupStep(3)
    } catch { setSetupError('Gagal menghubungi server') }
    finally { setSetupLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Username dan password wajib diisi'); return }
    setLoading(true); setError('')
    try { await login(form.username, form.password); router.push('/dashboard') }
    catch (err) { setError(err.message || 'Login gagal') }
    finally { setLoading(false) }
  }

  const inp = {
    base: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '12px', padding: '12px 16px', width: '100%', fontSize: '14px', outline: 'none', fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' },
  }

  return (
    <>
      <Head>
        <title>WifiSekre.net</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          .lp-root { font-family: 'Sora', sans-serif !important; }
          .lp-mono { font-family: 'JetBrains Mono', monospace !important; }
          .lp-bg {
            background-color: #07080f;
            background-image:
              radial-gradient(ellipse 80% 50% at 50% -5%, rgba(124,58,237,0.4) 0%, transparent 60%),
              radial-gradient(ellipse 35% 35% at 80% 85%, rgba(99,102,241,0.15) 0%, transparent 55%),
              radial-gradient(ellipse 25% 25% at 15% 65%, rgba(139,92,246,0.1) 0%, transparent 50%);
          }
          .lp-grid {
            background-image:
              linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px);
            background-size: 44px 44px;
          }
          .lp-grid-dots {
            background-image: radial-gradient(circle, rgba(139,92,246,0.22) 1px, transparent 1px);
            background-size: 44px 44px;
            background-position: -1px -1px;
          }
          .lp-card {
            background: rgba(255,255,255,0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 20px;
            padding: 32px;
          }
          .lp-input {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #f1f5f9;
            border-radius: 12px;
            padding: 12px 16px;
            width: 100%;
            font-size: 14px;
            outline: none;
            font-family: 'JetBrains Mono', monospace;
            transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
          }
          .lp-input::placeholder { color: rgba(148,163,184,0.4); }
          .lp-input:focus {
            border-color: rgba(139,92,246,0.65);
            background: rgba(139,92,246,0.08);
            box-shadow: 0 0 0 3px rgba(139,92,246,0.14);
          }
          .lp-input.lp-input-pl { padding-left: 42px; }
          .lp-input.lp-input-pr { padding-right: 44px; }
          .lp-input.lp-err { border-color: rgba(239,68,68,0.55); background: rgba(239,68,68,0.06); }
          .lp-label {
            display: block;
            font-size: 10.5px;
            font-weight: 600;
            letter-spacing: 0.09em;
            text-transform: uppercase;
            color: rgba(148,163,184,0.6);
            margin-bottom: 7px;
          }
          .lp-btn {
            width: 100%;
            padding: 13px;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 60%, #8B5CF6 100%);
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            letter-spacing: 0.015em;
            border: none;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: transform 0.15s, box-shadow 0.15s;
            box-shadow: 0 4px 20px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.15);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .lp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(124,58,237,0.55), inset 0 1px 0 rgba(255,255,255,0.15); }
          .lp-btn:active:not(:disabled) { transform: translateY(0); }
          .lp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
          .lp-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.22); border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #fca5a5; display: flex; align-items: center; gap: 8px; }
          .lp-ring {
            position: absolute; border-radius: 50%;
            border: 1px solid rgba(139,92,246,0.2);
            animation: lp-ring 3s ease-out infinite;
          }
          @keyframes lp-ring {
            0% { transform: scale(0.7); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .lp-slide { animation: lp-slideup 0.55s cubic-bezier(0.22,1,0.36,1) both; }
          .lp-slide-d { animation: lp-slideup 0.55s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
          @keyframes lp-slideup {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .lp-setup-btn {
            width: 100%;
            display: flex; align-items: center; justify-content: space-between;
            padding: 11px 15px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            color: rgba(148,163,184,0.6);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .lp-setup-btn:hover { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.28); color: #c4b5fd; }
          .lp-admin-opt {
            width: 100%; display: flex; align-items: center; gap: 10px;
            padding: 10px 13px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            text-align: left; cursor: pointer;
            transition: all 0.15s;
            color: #cbd5e1; font-size: 13px;
          }
          .lp-admin-opt:hover { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.3); }
          .lp-admin-opt.sel { background: rgba(139,92,246,0.14); border-color: rgba(139,92,246,0.45); color: #c4b5fd; }
          .lp-hr { height: 1px; background: rgba(255,255,255,0.07); margin: 22px 0; }
          .lp-step-dot { height: 4px; border-radius: 4px; transition: all 0.3s; }
        `}</style>
      </Head>

      <div className="lp-root lp-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Grid layers */}
        <div className="lp-grid absolute inset-0 pointer-events-none" />
        <div className="lp-grid-dots absolute inset-0 pointer-events-none" />
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ width: '700px', height: '320px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(1px)' }} />

        <div className="relative w-full lp-slide" style={{ maxWidth: '390px' }}>

          {/* Logo */}
          <div className="text-center mb-9">
            <div className="relative inline-flex items-center justify-center mb-5" style={{ width: '72px', height: '72px' }}>
              <div className="lp-ring" style={{ width: '72px', height: '72px', animationDelay: '0s' }} />
              <div className="lp-ring" style={{ width: '72px', height: '72px', animationDelay: '1s' }} />
              <div className="lp-ring" style={{ width: '72px', height: '72px', animationDelay: '2s' }} />
              <div style={{ width: '56px', height: '56px', background: 'linear-gradient(145deg, #7c3aed, #5b21b6)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.2)', border: '1px solid rgba(196,181,253,0.25)', position: 'relative', zIndex: 1 }}>
                <Wifi style={{ width: '26px', height: '26px', color: 'white' }} />
              </div>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              WifiSekre<span style={{ color: '#a78bfa' }}>.net</span>
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.55)', marginTop: '6px' }}>
              Sistem Manajemen Voucher WiFi
            </p>
          </div>

          {/* Card */}
          <div className="lp-card lp-slide-d">

            {!showSetup ? (
              /* ── LOGIN ── */
              <>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}>Masuk ke Akun</h2>
                  <p style={{ fontSize: '12px', color: 'rgba(148,163,184,0.45)', marginTop: '4px' }}>Masukkan kredensial admin kamu</p>
                </div>

                {error && (
                  <div className="lp-error" style={{ marginBottom: '18px' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#f87171' }}>!</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="lp-label">Username</label>
                    <div style={{ position: 'relative' }}>
                      <User style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                      <input type="text" autoComplete="username" value={form.username}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                        placeholder="username" className="lp-input lp-input-pl" />
                    </div>
                  </div>

                  <div>
                    <label className="lp-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <Lock style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                      <input type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                        value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••" className="lp-input lp-input-pl lp-input-pr" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.4)', padding: 0 }}>
                        {showPassword ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ paddingTop: '4px' }}>
                    <button type="submit" disabled={loading} className="lp-btn">
                      {loading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Memverifikasi...</> : 'Masuk'}
                    </button>
                  </div>
                </form>

                <div className="lp-hr" />

                <button onClick={handleToggleSetup} className="lp-setup-btn" style={{ fontFamily: 'Sora, sans-serif' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key style={{ width: '13px', height: '13px', color: '#8B5CF6' }} />
                    Admin baru? Aktivasi akun
                  </span>
                  <ChevronDown style={{ width: '15px', height: '15px' }} />
                </button>
              </>
            ) : (
              /* ── SETUP ── */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <button onClick={handleToggleSetup}
                    style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(148,163,184,0.6)', flexShrink: 0 }}>
                    <ArrowLeft style={{ width: '15px', height: '15px' }} />
                  </button>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>Aktivasi Akun</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                      {[1, 2].map(s => (
                        <div key={s} className="lp-step-dot"
                          style={{ width: setupStep > s ? '18px' : setupStep === s ? '24px' : '8px', background: setupStep >= s ? '#8B5CF6' : 'rgba(255,255,255,0.1)' }} />
                      ))}
                      <span style={{ fontSize: '11px', color: 'rgba(148,163,184,0.4)', marginLeft: '4px' }}>
                        {setupStep === 1 ? 'Verifikasi' : setupStep === 2 ? 'Buat Akun' : 'Selesai'}
                      </span>
                    </div>
                  </div>
                </div>

                {setupStep === 1 && (
                  <form onSubmit={handleSecretSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="lp-label">Kode Rahasia</label>
                      <div style={{ position: 'relative' }}>
                        <Key style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                        <input type="text" value={setupSecret} onChange={e => setSetupSecret(e.target.value)}
                          placeholder="Kode dari superadmin" className="lp-input lp-input-pl" />
                      </div>
                      {secretError && <p style={{ fontSize: '12px', color: '#fca5a5', marginTop: '6px' }}>{secretError}</p>}
                      <p style={{ fontSize: '11.5px', color: 'rgba(148,163,184,0.38)', marginTop: '5px' }}>Hubungi superadmin untuk mendapatkan kode ini.</p>
                    </div>
                    <button type="submit" disabled={loadingAdmins} className="lp-btn">
                      {loadingAdmins ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Memverifikasi...</> : 'Verifikasi Kode'}
                    </button>
                  </form>
                )}

                {setupStep === 2 && (
                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label className="lp-label">Pilih Nama Kamu</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {pendingAdmins.map(admin => (
                          <button key={admin.id} type="button" onClick={() => setSelectedAdmin(admin)}
                            className={`lp-admin-opt ${selectedAdmin?.id === admin.id ? 'sel' : ''}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0, background: selectedAdmin?.id === admin.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)', color: selectedAdmin?.id === admin.id ? '#c4b5fd' : 'rgba(148,163,184,0.6)' }}>
                              {admin.full_name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{admin.full_name}</span>
                            {selectedAdmin?.id === admin.id && <CheckCircle style={{ width: '15px', height: '15px', marginLeft: 'auto', flexShrink: 0, color: '#8B5CF6' }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="lp-label">Username</label>
                      <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          placeholder="Username untuk login" className="lp-input lp-input-pl" />
                      </div>
                    </div>
                    <div>
                      <label className="lp-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                        <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 6 karakter" className="lp-input lp-input-pl lp-input-pr" />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                          style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.4)', padding: 0 }}>
                          {showNewPass ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="lp-label">Konfirmasi Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'rgba(148,163,184,0.35)' }} />
                        <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className={`lp-input lp-input-pl lp-input-pr ${confirmPassword && confirmPassword !== newPassword ? 'lp-err' : ''}`} />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                          style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.4)', padding: 0 }}>
                          {showConfirm ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                        </button>
                      </div>
                    </div>
                    {setupError && <div className="lp-error"><span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>!</span>{setupError}</div>}
                    <button type="submit" disabled={setupLoading} className="lp-btn">
                      {setupLoading ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> Menyimpan...</> : <><CheckCircle style={{ width: '16px', height: '16px' }} /> Aktivasi Akun</>}
                    </button>
                  </form>
                )}

                {setupStep === 3 && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <CheckCircle style={{ width: '28px', height: '28px', color: '#4ade80' }} />
                    </div>
                    <h3 style={{ fontWeight: 600, color: 'white', marginBottom: '6px' }}>Akun Aktif, {successName}! 🎉</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(148,163,184,0.45)', marginBottom: '20px' }}>
                      Gunakan username & password yang baru kamu buat untuk login.
                    </p>
                    <button type="button" onClick={() => { setShowSetup(false); setSetupStep(1) }} className="lp-btn">
                      Login Sekarang
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="lp-mono" style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(148,163,184,0.2)', marginTop: '20px', letterSpacing: '0.08em' }}>
            WIFI VOUCHER MANAGEMENT · v2.0.2
          </p>
        </div>
      </div>
    </>
  )
}