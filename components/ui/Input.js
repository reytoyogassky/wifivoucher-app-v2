import clsx from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(function Input({
  label,
  error,
  icon: Icon,
  iconRight,
  className = '',
  containerClass = '',
  required,
  ...props
}, ref) {
  return (
    <div className={containerClass}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'input',
            Icon && 'pl-10',
            iconRight && 'pr-10',
            error && 'input-error',
            className,
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
})

export default Input

export function Select({ label, error, children, className = '', containerClass = '', required, ...props }) {
  return (
    <div className={containerClass}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={clsx('input', error && 'input-error', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', containerClass = '', required, ...props }) {
  return (
    <div className={containerClass}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={clsx('input resize-none', error && 'input-error', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
