import { Button } from '../../components/ui/Button'
import { formatDay, formatDuration, formatTimeRange } from '../../lib/format'
import type { Slot } from '../../types/api'

interface BookingBarProps {
  selected: Slot[]
  isPending: boolean
  onBook: () => void
  onClear: () => void
}

const byStart = (a: Slot, b: Slot) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()

const isConsecutive = (sorted: Slot[]) =>
  sorted.every(
    (slot, i) => i === 0 || new Date(slot.startAt).getTime() === new Date(sorted[i - 1].endAt).getTime(),
  )

export function BookingBar({ selected, isPending, onBook, onClear }: BookingBarProps) {
  if (selected.length === 0) return null

  const sorted = [...selected].sort(byStart)
  const consecutive = isConsecutive(sorted)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  return (
    <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
      <div className="text-sm">
        {consecutive ? (
          <>
            <p className="font-medium text-gray-900">
              {formatDay(first.startAt)} · {formatTimeRange(first.startAt, last.endAt)}
            </p>
            <p className="text-gray-500">
              {selected.length} slot{selected.length === 1 ? '' : 's'} ·{' '}
              {formatDuration(first.startAt, last.endAt)} session
            </p>
          </>
        ) : (
          <p className="text-amber-700">
            {selected.length} slots selected — pick back-to-back slots to book a longer session.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClear} disabled={isPending}>
          Clear
        </Button>
        <Button onClick={onBook} isLoading={isPending} disabled={!consecutive}>
          Book
        </Button>
      </div>
    </div>
  )
}
