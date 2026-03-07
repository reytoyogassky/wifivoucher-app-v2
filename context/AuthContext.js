import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { APP_CONFIG, ROUTES } from '../constants/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(APP_CONFIG.sessionKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Check expiry
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          setAdmin(parsed.admin)
        } else {
          localStorage.removeItem(APP_CONFIG.sessionKey)
        }
      } catch {
        localStorage.removeItem(APP_CONFIG.sessionKey)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Login gagal')
    }

    // Store session with 8-hour expiry
    const session = {
      admin: data.admin,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    }
    localStorage.setItem(APP_CONFIG.sessionKey, JSON.stringify(session))
    setAdmin(data.admin)

    return data.admin
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(APP_CONFIG.sessionKey)
    setAdmin(null)
    router.push(ROUTES.login)
  }, [router])

  const isSuperAdmin = admin?.role === 'superadmin'

  const value = {
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin,
    isSuperAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
