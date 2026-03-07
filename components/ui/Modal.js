import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideClose = false,
  footer,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={clsx(
        'relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-slide-up',
        'flex flex-col max-h-[90vh]',
        SIZES[size],
      )}>
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            {title && (
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading, confirmText = 'Hapus', confirmVariant = 'danger' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 dark:text-gray-300 text-sm">{message}</p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="btn-secondary btn flex-1"
          disabled={loading}
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={clsx(
            'btn flex-1',
            confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'
          )}
        >
          {loading ? 'Memproses...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}