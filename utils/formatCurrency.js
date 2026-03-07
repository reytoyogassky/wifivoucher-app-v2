import { APP_CONFIG } from '../constants/config'

/**
 * Format number as Indonesian Rupiah
 */
export function formatCurrency(amount, options = {}) {
  const { compact = false, withSymbol = true } = options

  if (amount === null || amount === undefined) return '-'

  const num = Number(amount)

  if (compact && num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace('.0', '')
    return withSymbol ? `Rp ${formatted}jt` : `${formatted}jt`
  }

  if (compact && num >= 1_000) {
    const formatted = (num / 1_000).toFixed(0)
    return withSymbol ? `Rp ${formatted}rb` : `${formatted}rb`
  }

  const formatted = new Intl.NumberFormat(APP_CONFIG.locale, {
    style: 'currency',
    currency: APP_CONFIG.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)

  return formatted
}

/**
 * Parse currency string to number
 */
export function parseCurrency(str) {
  if (!str) return 0
  return Number(str.toString().replace(/[^0-9]/g, ''))
}

/**
 * Format number with thousand separator
 */
export function formatNumber(num) {
  return new Intl.NumberFormat(APP_CONFIG.locale).format(Number(num))
}
