import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDay, formatDuration, formatTimeRange } from '../../lib/format'
import type { Booking } from '../../types/api'

interface BookingCardProps {
  booking: Booking
  isCancelling: boolean
  onCancel: (bookingId: string) => void
}

export function BookingCard({ booking, isCancelling, onCancel }: BookingCardProps) {
  const { slot, status } = booking
  const confirmed = status === 'CONFIRMED'

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-4 ${
        confirmed ? 'border-l-green-500' : 'border-l-gray-300'
      }`}
    >
      <div>
        <p className="font-medium text-gray-900">{slot.provider.name}</p>
        <p className="text-sm text-gray-600">
          {formatDay(slot.startAt)} · {formatTimeRange(slot.startAt, slot.endAt)}
          <span className="ml-2 text-xs text-gray-400">{formatDuration(slot.startAt, slot.endAt)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge value={status} />
        {confirmed && (
          <Button
            variant="danger"
            isLoading={isCancelling}
            onClick={() => {
              if (window.confirm('Cancel this booking?')) onCancel(booking.id)
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </li>
  )
}
