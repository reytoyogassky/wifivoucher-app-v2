import clsx from 'clsx'

const VARIANTS = {
  green:  'badge-green',
  red:    'badge-red',
  yellow: 'badge-yellow',
  purple: 'badge-purple',
  blue:   'badge-blue',
  gray:   'badge-gray',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
}

export default function Badge({ children, variant = 'gray', className = '', dot = false }) {
  return (
    <span className={clsx('badge', VARIANTS[variant], className)}>
      {dot && (
        <span className={clsx(
          'mr-1.5 w-1.5 h-1.5 rounded-full inline-block',
          variant === 'green' && 'bg-emerald-500',
          variant === 'red' && 'bg-red-500',
          variant === 'yellow' && 'bg-amber-500',
          variant === 'purple' && 'bg-purple-500',
          variant === 'blue' && 'bg-blue-500',
          variant === 'gray' && 'bg-gray-400',
          variant === 'orange' && 'bg-orange-500',
        )} />
      )}
      {children}
    </span>
  )
}
