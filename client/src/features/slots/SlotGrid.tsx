import { formatDuration, formatTimeRange, groupByDay } from '../../lib/format'
import type { Slot } from '../../types/api'

interface SlotGridProps {
  slots: Slot[]
  selectedIds: string[]
  onToggle: (slotId: string) => void
}

export function SlotGrid({ slots, selectedIds, onToggle }: SlotGridProps) {
  return (
    <div className="space-y-6">
      {groupByDay(slots).map(([day, daySlots]) => (
        <section key={day}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{day}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {daySlots.map((slot) => {
              const selected = selectedIds.includes(slot.id)
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggle(slot.id)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${selected
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-indigo-400 hover:bg-indigo-50'
                    }`}
                >
                  <span className="block text-sm font-medium">
                    {formatTimeRange(slot.startAt, slot.endAt)}
                  </span>
                  <span className={`block text-xs ${selected ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {formatDuration(slot.startAt, slot.endAt)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
