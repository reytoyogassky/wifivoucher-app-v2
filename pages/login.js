import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Eye, EyeOff, Wifi, Lock, User, Loader2, Key, ChevronDown, CheckCircle, ArrowLeft, Shield } from 'lucide-react'
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
    setShowSetup(p => !p); setSetupStep(1); setSetupSecret(''); setSecretError('')
    setPendingAdmins([]); setSelectedAdmin(null); setNewUsername('')
    setNewPassword(''); setConfirmPassword(''); setSetupError('')
  }

  async function handleSecretSubmit(e) {
    e.preventDefault(); setSecretError('')
    if (!setupSecret.trim()) { setSecretError('Masukkan kode setup terlebih dahulu'); return }
    setLoadingAdmins(true)
    try {
      const res = await fetch('/api/setup/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setupSecret }) })
      if (!res.ok) { const d = await res.json(); setSecretError(d.message || 'Kode salah'); return }
      const { data, error } = await supabase.from('admins').select('id, full_name').is('username', null).eq('role', 'admin').order('full_name')
      if (error) throw error
      if (!data?.length) { setSecretError('Semua admin sudah memiliki akun.'); return }
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
      const d = await res.json()
      if (!res.ok) { setSetupError(d.message || 'Terjadi kesalahan'); return }
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

  return (
    <>
      <Head>
        <title>WifiSekre.net — Login</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          .lp { font-family: 'DM Sans', sans-serif; }
          .lp-mono { font-family: 'Fira Code', monospace; }

          /* ── Full page ── */
          .lp-wrap {
            min-height: 100dvh;
            min-height: 100vh;
            display: flex;
            background: #faf9ff;
          }

          /* ═══════════════════════════════════════════
             LEFT DECORATIVE PANEL (desktop only)
          ═══════════════════════════════════════════ */
          .lp-left {
            display: none;
            position: relative;
            overflow: hidden;
            background: linear-gradient(145deg, #6d28d9 0%, #7c3aed 40%, #8B5CF6 70%, #a78bfa 100%);
          }
          @media (min-width: 1024px) {
            .lp-left {
              display: flex; flex: 1;
              flex-direction: column; align-items: center; justify-content: center;
            }
          }

          .lp-left-noise {
            position: absolute; inset: 0; opacity: 0.04;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .lp-left::after {
            content: ''; position: absolute; inset: 0;
            background-image: repeating-linear-gradient(
              -45deg, transparent 0, transparent 24px,
              rgba(255,255,255,0.03) 24px, rgba(255,255,255,0.03) 25px
            );
          }

          /* Signal arcs */
          .signal-wrap {
            position: relative; width: 240px; height: 240px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 40px;
          }
          .signal-arc {
            position: absolute; border-radius: 50%;
            border: 1.5px solid rgba(255,255,255,0.22);
            animation: arc-pulse 3s ease-out infinite;
          }
          .signal-arc:nth-child(1) { width: 80px; height: 80px; animation-delay: 0s; }
          .signal-arc:nth-child(2) { width: 130px; height: 130px; animation-delay: 0.6s; }
          .signal-arc:nth-child(3) { width: 185px; height: 185px; animation-delay: 1.2s; }
          .signal-arc:nth-child(4) { width: 240px; height: 240px; animation-delay: 1.8s; }
          @keyframes arc-pulse {
            0% { transform: scale(0.85); opacity: 0.9; }
            100% { transform: scale(1.05); opacity: 0; }
          }
          .signal-core {
            position: relative; z-index: 1;
            width: 72px; height: 72px; border-radius: 20px;
            background: rgba(255,255,255,0.18);
            border: 1.5px solid rgba(255,255,255,0.35);
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(8px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3);
          }

          /* Floating chips */
          .stat-chip {
            position: absolute;
            background: rgba(255,255,255,0.14);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 12px; padding: 10px 16px;
            backdrop-filter: blur(12px);
            display: flex; align-items: center; gap: 8px;
            animation: float 6s ease-in-out infinite;
          }
          .stat-chip:nth-child(1) { top: 12%; left: 8%; animation-delay: 0s; }
          .stat-chip:nth-child(2) { top: 20%; right: 6%; animation-delay: 1.5s; }
          .stat-chip:nth-child(3) { bottom: 22%; left: 6%; animation-delay: 3s; }
          .stat-chip:nth-child(4) { bottom: 14%; right: 8%; animation-delay: 4.5s; }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          /* ═══════════════════════════════════════════
             RIGHT FORM PANEL
          ═══════════════════════════════════════════ */
          .lp-right {
            width: 100%;
            display: flex; flex-direction: column;
            background: #ffffff;
          }
          @media (min-width: 1024px) {
            .lp-right { width: 440px; flex-shrink: 0; }
          }

          /* ── Mobile top banner ── */
          .lp-mobile-banner {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 36px 24px 28px;
            background: linear-gradient(160deg, #6d28d9 0%, #7c3aed 50%, #8B5CF6 100%);
            position: relative;
            overflow: hidden;
          }
          @media (min-width: 1024px) {
            .lp-mobile-banner { display: none; }
          }

          /* Subtle arc pattern in banner */
          .lp-mobile-banner::before {
            content: '';
            position: absolute; inset: 0;
            background-image: repeating-linear-gradient(
              -45deg, transparent 0, transparent 20px,
              rgba(255,255,255,0.04) 20px, rgba(255,255,255,0.04) 21px
            );
          }
          /* Bottom wave mask */
          .lp-banner-wave {
            position: absolute;
            bottom: -1px; left: 0; right: 0;
            height: 28px;
            background: #ffffff;
            border-radius: 28px 28px 0 0;
          }

          .lp-banner-orb {
            position: relative; z-index: 1;
            width: 64px; height: 64px; border-radius: 20px;
            background: rgba(255,255,255,0.18);
            border: 1.5px solid rgba(255,255,255,0.35);
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(8px);
            box-shadow: 0 8px 28px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3);
            margin-bottom: 14px;
            animation: banner-pop 0.5s cubic-bezier(0.22,1,0.36,1) both;
          }
          @keyframes banner-pop {
            from { opacity: 0; transform: scale(0.8) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }

          .lp-banner-title {
            position: relative; z-index: 1;
            font-size: 20px; font-weight: 700;
            color: #fff; letter-spacing: -0.03em;
            margin-bottom: 4px;
            animation: banner-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.06s both;
          }
          .lp-banner-title span { color: rgba(255,255,255,0.6); }
          .lp-banner-sub {
            position: relative; z-index: 1;
            font-size: 12px; color: rgba(255,255,255,0.6);
            margin-bottom: 20px;
            animation: banner-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both;
          }

          /* Status pills */
          .lp-banner-pills {
            position: relative; z-index: 1;
            display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
            animation: banner-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.14s both;
          }
          .lp-pill {
            display: flex; align-items: center; gap: 5px;
            padding: 5px 10px;
            background: rgba(255,255,255,0.14);
            border: 1px solid rgba(255,255,255,0.22);
            border-radius: 50px;
            font-size: 11px; font-weight: 600;
            color: rgba(255,255,255,0.85);
          }
          .lp-pill-dot {
            width: 6px; height: 6px; border-radius: 50%;
          }

          /* ── Form scroll area ── */
          .lp-form-scroll {
            flex: 1;
            overflow-y: auto;
            display: flex; align-items: flex-start; justify-content: center;
            padding: 28px 24px 40px;
          }
          @media (min-width: 1024px) {
            .lp-form-scroll {
              align-items: center;
              padding: 40px 48px;
            }
          }

          .lp-form-wrap { width: 100%; max-width: 360px; }

          /* Desktop logo (hidden mobile) */
          .lp-desktop-logo {
            display: none;
            align-items: center; gap: 10px;
            margin-bottom: 32px;
          }
          @media (min-width: 1024px) {
            .lp-desktop-logo { display: flex; }
          }
          .lp-logo-icon {
            width: 40px; height: 40px; border-radius: 12px;
            background: linear-gradient(135deg, #7c3aed, #8B5CF6);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 14px rgba(124,58,237,0.35); flex-shrink: 0;
          }

          /* ── Inputs ── */
          .lp-input {
            width: 100%; padding: 11px 14px 11px 42px;
            border: 1.5px solid #e5e7eb; border-radius: 10px;
            font-size: 14px; color: #111827;
            background: #fafafa; outline: none;
            transition: all 0.18s;
            font-family: 'Fira Code', monospace;
            box-sizing: border-box;
          }
          .lp-input::placeholder { color: #9ca3af; font-family: 'DM Sans', sans-serif; }
          .lp-input:focus {
            border-color: #8B5CF6; background: #ffffff;
            box-shadow: 0 0 0 3px rgba(139,92,246,0.12);
          }
          .lp-input.lp-input-pr { padding-right: 42px; }
          .lp-input.err { border-color: #f87171; background: #fff5f5; }

          /* ── Button ── */
          .lp-btn-primary {
            width: 100%; padding: 12px;
            background: linear-gradient(135deg, #7c3aed 0%, #8B5CF6 100%);
            color: white; border: none; border-radius: 10px;
            font-size: 14px; font-weight: 600;
            cursor: pointer; position: relative; overflow: hidden;
            transition: all 0.18s;
            box-shadow: 0 4px 14px rgba(124,58,237,0.35);
            display: flex; align-items: center; justify-content: center; gap: 8px;
            font-family: 'DM Sans', sans-serif;
          }
          .lp-btn-primary::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%);
          }
          .lp-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(124,58,237,0.45); }
          .lp-btn-primary:active:not(:disabled) { transform: translateY(0); }
          .lp-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

          /* ── Label ── */
          .lp-label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; letter-spacing: 0.01em; }

          /* ── Error box ── */
          .lp-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #dc2626; display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
          .lp-err-icon { width: 18px; height: 18px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; color: #dc2626; }

          /* ── Setup toggle ── */
          .lp-setup-toggle {
            width: 100%; display: flex; align-items: center; justify-content: space-between;
            padding: 11px 14px; border: 1.5px dashed #e5e7eb; border-radius: 10px;
            background: transparent; cursor: pointer; color: #6b7280; font-size: 13px;
            transition: all 0.18s; font-family: 'DM Sans', sans-serif;
          }
          .lp-setup-toggle:hover { border-color: #8B5CF6; color: #7c3aed; background: #f5f3ff; }

          /* ── Admin option ── */
          .lp-admin-opt {
            width: 100%; display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 9px;
            background: white; cursor: pointer; font-size: 13px; color: #374151;
            transition: all 0.15s; text-align: left; font-family: 'DM Sans', sans-serif;
            margin-bottom: 8px;
          }
          .lp-admin-opt:hover { border-color: #a78bfa; background: #f5f3ff; }
          .lp-admin-opt.sel { border-color: #8B5CF6; background: #f5f3ff; color: #6d28d9; }

          /* ── Step bar ── */
          .lp-step { height: 3px; border-radius: 99px; transition: all 0.3s; }

          /* ── Divider ── */
          .lp-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
          .lp-divider::before, .lp-divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

          /* ── Animations ── */
          .lp-fadein { animation: lp-fadein 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          .lp-fadein-d { animation: lp-fadein 0.4s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
          @keyframes lp-fadein {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </Head>

      <div className="lp lp-wrap">

        {/* ── LEFT PANEL (desktop only) ── */}
        <div className="lp-left">
          <div className="lp-left-noise" />

          {/* Floating chips */}
          <div className="stat-chip">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wifi style={{ width: 14, height: 14, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1 }}>Voucher Aktif</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>440</div>
            </div>
          </div>
          <div className="stat-chip">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield style={{ width: 14, height: 14, color: 'white' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1 }}>Super Aman</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>v1.0</div>
            </div>
          </div>
          <div className="stat-chip">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            <div style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>Sistem Online</div>
          </div>
          <div className="stat-chip">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />
            <div style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>Real-time Sync</div>
          </div>

          {/* Center signal */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="signal-wrap">
              <div className="signal-arc" /><div className="signal-arc" />
              <div className="signal-arc" /><div className="signal-arc" />
              <div className="signal-core">
                <Wifi style={{ width: 32, height: 32, color: 'white' }} />
              </div>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'white', textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 12 }}>
              WifiSekre<span style={{ color: 'rgba(255,255,255,0.55)' }}>.net</span>
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
              Sistem manajemen voucher WiFi yang cepat, aman, dan terpercaya
            </p>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Manajemen voucher real-time', 'Laporan penjualan lengkap', 'Multi-admin dengan log aktivitas'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle style={{ width: 12, height: 12, color: 'white' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lp-right">

          {/* Mobile top banner (hidden on desktop) */}
          <div className="lp-mobile-banner">
            <div className="lp-banner-orb">
              <Wifi style={{ width: 28, height: 28, color: 'white' }} />
            </div>
            <div className="lp-banner-title">WifiSekre<span>.net</span></div>
            <div className="lp-banner-sub">Management System</div>
            <div className="lp-banner-pills">
              <div className="lp-pill">
                <div className="lp-pill-dot" style={{ background: '#4ade80', boxShadow: '0 0 5px #4ade80' }} />
                Sistem Online
              </div>
              <div className="lp-pill">
                <div className="lp-pill-dot" style={{ background: '#fbbf24', boxShadow: '0 0 5px #fbbf24' }} />
                Real-time Sync
              </div>
              <div className="lp-pill">
                <Shield style={{ width: 10, height: 10, color: 'rgba(255,255,255,0.85)' }} />
                Super Aman
              </div>
            </div>
            <div className="lp-banner-wave" />
          </div>

          {/* Form area */}
          <div className="lp-form-scroll">
            <div className="lp-form-wrap">

              {/* Desktop logo (hidden mobile) */}
              <div className="lp-desktop-logo lp-fadein">
                <div className="lp-logo-icon">
                  <Wifi style={{ width: 20, height: 20, color: 'white' }} />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                    WifiSekre<span style={{ color: '#7c3aed' }}>.net</span>
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Management System</p>
                </div>
              </div>

              {!showSetup ? (
                /* ── LOGIN FORM ── */
                <div className="lp-fadein-d">
                  <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Selamat datang 👋</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Masuk ke akun admin kamu</p>
                  </div>

                  {error && (
                    <div className="lp-error">
                      <div className="lp-err-icon">!</div>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="lp-label">Username</label>
                      <div style={{ position: 'relative' }}>
                        <User style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                        <input type="text" autoComplete="username" value={form.username}
                          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                          placeholder="Masukkan username"
                          className="lp-input lp-mono" />
                      </div>
                    </div>
                    <div>
                      <label className="lp-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af' }} />
                        <input type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                          value={form.password}
                          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                          placeholder="Masukkan password"
                          className="lp-input lp-input-pr lp-mono" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                          {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <button type="submit" disabled={loading} className="lp-btn-primary">
                        {loading
                          ? <><Loader2 style={{ width: 16, height: 16 }} className="spin" />Memverifikasi...</>
                          : 'Masuk'}
                      </button>
                    </div>
                  </form>

                  <div className="lp-divider">
                    <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>Admin baru?</span>
                  </div>

                  <button onClick={handleToggleSetup} className="lp-setup-toggle">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Key style={{ width: 14, height: 14, color: '#8B5CF6' }} />
                      Aktivasi akun admin baru
                    </span>
                    <ChevronDown style={{ width: 15, height: 15 }} />
                  </button>
                </div>

              ) : (
                /* ── SETUP PANEL ── */
                <div className="lp-fadein-d">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <button onClick={handleToggleSetup}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0, transition: 'all 0.15s' }}>
                      <ArrowLeft style={{ width: 15, height: 15 }} />
                    </button>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Aktivasi Akun</h2>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                        {[1, 2].map(s => (
                          <div key={s} className="lp-step"
                            style={{ width: setupStep >= s ? 28 : 10, background: setupStep >= s ? '#8B5CF6' : '#e5e7eb' }} />
                        ))}
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
                          {setupStep === 1 ? 'Verifikasi kode' : setupStep === 2 ? 'Buat akun' : 'Selesai'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 */}
                  {setupStep === 1 && (
                    <form onSubmit={handleSecretSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label className="lp-label">Kode Rahasia</label>
                        <div style={{ position: 'relative' }}>
                          <Key style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                          <input type="text" value={setupSecret}
                            onChange={e => setSetupSecret(e.target.value)}
                            placeholder="Kode dari superadmin"
                            className="lp-input lp-mono" />
                        </div>
                        {secretError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 5 }}>{secretError}</p>}
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Hubungi superadmin untuk mendapatkan kode ini.</p>
                      </div>
                      <button type="submit" disabled={loadingAdmins} className="lp-btn-primary">
                        {loadingAdmins
                          ? <><Loader2 style={{ width: 15, height: 15 }} className="spin" />Memverifikasi...</>
                          : 'Verifikasi Kode'}
                      </button>
                    </form>
                  )}

                  {/* Step 2 */}
                  {setupStep === 2 && (
                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label className="lp-label">Nama Kamu</label>
                        {pendingAdmins.map(admin => (
                          <button key={admin.id} type="button" onClick={() => setSelectedAdmin(admin)}
                            className={`lp-admin-opt ${selectedAdmin?.id === admin.id ? 'sel' : ''}`}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: selectedAdmin?.id === admin.id ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0, color: selectedAdmin?.id === admin.id ? '#7c3aed' : '#6b7280' }}>
                              {admin.full_name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 500 }}>{admin.full_name}</span>
                            {selectedAdmin?.id === admin.id && <CheckCircle style={{ width: 15, height: 15, marginLeft: 'auto', color: '#8B5CF6', flexShrink: 0 }} />}
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="lp-label">Username</label>
                        <div style={{ position: 'relative' }}>
                          <User style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                          <input type="text" value={newUsername}
                            onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                            placeholder="Username untuk login"
                            className="lp-input lp-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="lp-label">Password</label>
                        <div style={{ position: 'relative' }}>
                          <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                          <input type={showNewPass ? 'text' : 'password'} value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Min. 6 karakter"
                            className="lp-input lp-input-pr lp-mono" />
                          <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                            {showNewPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="lp-label">Konfirmasi Password</label>
                        <div style={{ position: 'relative' }}>
                          <Lock style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
                          <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password"
                            className={`lp-input lp-input-pr lp-mono ${confirmPassword && confirmPassword !== newPassword ? 'err' : ''}`} />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                            {showConfirm ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                          </button>
                        </div>
                      </div>
                      {setupError && <div className="lp-error" style={{ margin: 0 }}><div className="lp-err-icon">!</div>{setupError}</div>}
                      <button type="submit" disabled={setupLoading} className="lp-btn-primary">
                        {setupLoading
                          ? <><Loader2 style={{ width: 15, height: 15 }} className="spin" />Menyimpan...</>
                          : <><CheckCircle style={{ width: 15, height: 15 }} />Aktivasi Akun</>}
                      </button>
                    </form>
                  )}

                  {/* Step 3 */}
                  {setupStep === 3 && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <CheckCircle style={{ width: 30, height: 30, color: '#16a34a' }} />
                      </div>
                      <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 17, marginBottom: 6 }}>Akun Aktif! 🎉</h3>
                      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
                        Halo <strong style={{ color: '#7c3aed' }}>{successName}</strong>! Gunakan username & password barumu untuk login.
                      </p>
                      <button type="button" onClick={() => { setShowSetup(false); setSetupStep(1) }} className="lp-btn-primary">
                        Login Sekarang
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 28 }}>
                WiFi Voucher Management System · v1.0
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}