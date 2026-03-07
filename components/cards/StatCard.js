import clsx from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'purple',
  trend,
  trendLabel,
  className = '',
  loading = false,
}) {
  const colorConfig = {
    purple: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400',
      value: 'text-primary-700 dark:text-primary-300',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      value: 'text-emerald-700 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
      value: 'text-amber-700 dark:text-amber-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
      value: 'text-red-700 dark:text-red-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
      value: 'text-blue-700 dark:text-blue-400',
    },
  }

  const cfg = colorConfig[color] || colorConfig.purple

  if (loading) {
    return (
      <div className={clsx('card animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    )
  }

  return (
    <div className={clsx('card card-hover transition-all duration-200', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className={clsx('text-2xl font-bold tracking-tight', cfg.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={clsx(
              'inline-flex items-center gap-1 text-xs font-medium mt-2',
              trend >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}% {trendLabel}
            </div>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-3 rounded-xl', cfg.icon)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}