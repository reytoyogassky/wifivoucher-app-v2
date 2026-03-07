import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export default function Pagination({ currentPage, totalPages, onPageChange, count, limit = 20 }) {
  if (totalPages <= 1) return null

  const from = (currentPage - 1) * limit + 1
  const to = Math.min(currentPage * limit, count)

  const pages = generatePages(currentPage, totalPages)

  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Menampilkan <span className="font-medium text-gray-700">{from}–{to}</span> dari{' '}
        <span className="font-medium text-gray-700">{count}</span> data
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-secondary btn btn-sm !px-2 disabled:opacity-40"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dot-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={clsx(
                'btn btn-sm !px-3 min-w-[32px]',
                page === currentPage
                  ? 'btn-primary'
                  : 'btn-secondary'
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-secondary btn btn-sm !px-2 disabled:opacity-40"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function generatePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
}
