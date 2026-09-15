import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDuration, formatTimeRange } from '../../lib/format'
import type { ProviderSlot } from '../../types/api'

interface ProviderSlotCardProps {
  slot: ProviderSlot
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}

export function ProviderSlotCard({ slot, onEdit, onDelete, isDeleting }: ProviderSlotCardProps) {
  const booked = slot.booking !== null
  const past = new Date(slot.startAt) <= new Date()

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 ${
        booked ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'
      }`}
    >
      <div>
        <p className="font-medium text-gray-900">
          {formatTimeRange(slot.startAt, slot.endAt)}
          <span className="ml-2 text-xs font-normal text-gray-500">
            {formatDuration(slot.startAt, slot.endAt)}
          </span>
        </p>
        <p className="text-sm text-gray-600">
          {slot.booking ? (
            <>
              Booked by <span className="font-medium">{slot.booking.client.name}</span> ·{' '}
              {slot.booking.client.email}
            </>
          ) : (
            'Available'
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge value={booked ? 'BOOKED' : past ? 'PAST' : 'AVAILABLE'} />
        {!booked && !past && (
          <>
            <Button variant="secondary" onClick={onEdit} disabled={isDeleting}>
              Edit
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              onClick={() => {
                if (window.confirm('Delete this slot?')) onDelete()
              }}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
