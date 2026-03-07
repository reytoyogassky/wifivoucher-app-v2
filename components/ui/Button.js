import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  success:   'btn-success',
  ghost:     'btn text-gray-600 hover:bg-gray-100',
}

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
      {iconRight && !loading && <iconRight className="w-4 h-4" />}
    </button>
  )
}
