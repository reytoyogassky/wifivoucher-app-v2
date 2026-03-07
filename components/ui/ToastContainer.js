import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    className: 'border-emerald-200 bg-emerald-50',
    iconClass: 'text-emerald-500',
    titleClass: 'text-emerald-800',
    msgClass: 'text-emerald-700',
  },
  error: {
    icon: XCircle,
    className: 'border-red-200 bg-red-50',
    iconClass: 'text-red-500',
    titleClass: 'text-red-800',
    msgClass: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-800',
    msgClass: 'text-amber-700',
  },
  info: {
    icon: Info,
    className: 'border-blue-200 bg-blue-50',
    iconClass: 'text-blue-500',
    titleClass: 'text-blue-800',
    msgClass: 'text-blue-700',
  },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications()

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function Toast({ toast, onRemove }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info
  const Icon = config.icon

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm
        toast-enter animate-slide-down
        ${config.className}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.iconClass}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold ${config.titleClass}`}>{toast.title}</p>
        )}
        {toast.message && (
          <p className={`text-xs mt-0.5 ${config.msgClass} line-clamp-2`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
