import type { PageMeta } from '../../types/api'
import { Button } from './Button'

interface PaginationProps {
  meta: PageMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta.hasNext && !meta.hasPrevious) return null

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <Button variant="secondary" disabled={!meta.hasPrevious} onClick={() => onPageChange(meta.page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-gray-500">Page {meta.page}</span>
      <Button variant="secondary" disabled={!meta.hasNext} onClick={() => onPageChange(meta.page + 1)}>
        Next
      </Button>
    </nav>
  )
}
