import { useState, useCallback } from 'react'
import { getDebts, getDebtSummary, payDebt } from '../services/debtService'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from './useAuth'

export function useDebts(initialFilters = {}) {
  const [debts, setDebts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, count: 0 })
  const [filters, setFilters] = useState(initialFilters)
  const { addToast } = useNotifications()
  const { admin } = useAuth()

  const fetchDebts = useCallback(async (newFilters = filters, page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDebts({ ...newFilters, page, limit: 20 })
      setDebts(result.data)
      setPagination({ page, totalPages: result.totalPages, count: result.count })
    } catch (err) {
      setError(err.message)
      addToast({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [filters, addToast])

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getDebtSummary()
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch debt summary:', err)
    }
  }, [])

  const handlePayDebt = useCallback(async (debtId, amount, notes) => {
    try {
      await payDebt({ debtId, adminId: admin.id, amount, notes })
      addToast({ type: 'success', title: 'Pembayaran berhasil!', message: `Rp ${Number(amount).toLocaleString('id-ID')} diterima` })
      fetchDebts(filters, pagination.page)
      fetchSummary()
      return true
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal', message: err.message })
      return false
    }
  }, [admin, filters, pagination.page, addToast, fetchDebts, fetchSummary])

  const updateFilters = useCallback((newFilters) => {
    const merged = { ...filters, ...newFilters }
    setFilters(merged)
    fetchDebts(merged, 1)
  }, [filters, fetchDebts])

  return {
    debts,
    summary,
    loading,
    error,
    pagination,
    filters,
    fetchDebts,
    fetchSummary,
    handlePayDebt,
    updateFilters,
    setPage: (page) => fetchDebts(filters, page),
  }
}
