import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import { Wifi } from 'lucide-react'

export default function withAuth(Component, { superadminOnly = false } = {}) {
  function AuthenticatedPage(props) {
    const { admin, loading, isAuthenticated, isSuperAdmin } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          router.replace('/login')
        } else if (superadminOnly && !isSuperAdmin) {
          router.replace('/dashboard')
        }
      }
    }, [loading, isAuthenticated, isSuperAdmin, router])

    if (loading || !isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-glow animate-pulse-slow">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
          </div>
        </div>
      )
    }

    if (superadminOnly && !isSuperAdmin) {
      return null
    }

    return <Component {...props} />
  }

  // Preserve getLayout from wrapped component
  if (Component.getLayout) {
    AuthenticatedPage.getLayout = Component.getLayout
  }

  return AuthenticatedPage
}
