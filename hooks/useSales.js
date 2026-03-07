import { useState, useCallback } from 'react'
import { getSales, getSalesSummary } from '../services/salesService'
import { useNotifications } from '../context/NotificationContext'

export function useSales(initialFilters = {}) {
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, count: 0 })
  const [filters, setFilters] = useState(initialFilters)
  const { addToast } = useNotifications()

  const fetchSales = useCallback(async (newFilters = filters, page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSales({ ...newFilters, page, limit: 20 })
      setSales(result.data)
      setPagination({ page, totalPages: result.totalPages, count: result.count })
    } catch (err) {
      setError(err.message)
      addToast({ type: 'error', title: 'Error', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [filters, addToast])

  const fetchSummary = useCallback(async (startDate, endDate) => {
    try {
      const data = await getSalesSummary(startDate, endDate)
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch sales summary:', err)
    }
  }, [])

  const updateFilters = useCallback((newFilters) => {
    const merged = { ...filters, ...newFilters }
    setFilters(merged)
    fetchSales(merged, 1)
  }, [filters, fetchSales])

  return {
    sales,
    summary,
    loading,
    error,
    pagination,
    filters,
    fetchSales,
    fetchSummary,
    updateFilters,
    setPage: (page) => fetchSales(filters, page),
  }
}
