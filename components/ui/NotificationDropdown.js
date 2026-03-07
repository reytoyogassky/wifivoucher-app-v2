import { useEffect, useRef } from 'react'
import { Bell, CheckCheck, Wifi } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { formatRelativeTime } from '../../utils/formatDate'
import clsx from 'clsx'

const TYPE_COLORS = {
  success: 'bg-emerald-100 text-emerald-600',
  error:   'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  info:    'bg-blue-100 text-blue-600',
}

export default function NotificationDropdown({ isOpen, onClose }) {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-down z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Notifikasi</span>
          {unreadCount > 0 && (
            <span className="bg-primary-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Tandai semua
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Wifi className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Belum ada notifikasi</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={clsx(
                'px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                !n.read && 'bg-primary-50/30',
              )}
            >
              <div className="flex gap-3">
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm', TYPE_COLORS[n.type] || TYPE_COLORS.info)}>
                  {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : n.type === 'warning' ? '⚠' : 'i'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.read && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
