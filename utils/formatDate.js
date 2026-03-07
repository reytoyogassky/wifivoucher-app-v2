import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

/**
 * Format date to readable string
 */
export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return '-'
  return format(d, fmt, { locale: id })
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

/**
 * Format relative time (e.g., "2 jam yang lalu")
 */
export function formatRelativeTime(date) {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return '-'
  return formatDistanceToNow(d, { addSuffix: true, locale: id })
}

/**
 * Check if date is overdue
 */
export function isOverdue(date) {
  if (!date) return false
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  return d < new Date()
}

/**
 * Get days until due date (negative = overdue)
 */
export function getDaysUntilDue(date) {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  const now = new Date()
  const diff = Math.floor((d - now) / (1000 * 60 * 60 * 24))
  return diff
}

/**
 * Format for input[type=date]
 */
export function toInputDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}

/**
 * Start of today
 */
export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * End of today
 */
export function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}
