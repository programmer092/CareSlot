import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { DateRangeFields } from '../../components/ui/DateRangeFields'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../lib/api'
import { dateInputToIso, defaultDateRange, type DateRange } from '../../lib/format'
import { useBookSlots } from '../bookings/hooks'
import { BookingBar } from './BookingBar'
import { useAvailableSlots, useProviders } from './hooks'
import { ProviderSelect } from './ProviderSelect'
import { SlotGrid } from './SlotGrid'

export function SlotsPage() {
  const [providerId, setProviderId] = useState('')
  const [range, setRange] = useState(defaultDateRange)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const providers = useProviders()
  // Fall back to the first provider until the user picks one.
  const activeProviderId = providerId || providers.data?.[0]?.id || ''
  const slots = useAvailableSlots(
    activeProviderId,
    dateInputToIso(range.from),
    dateInputToIso(range.to, true),
  )
  const book = useBookSlots()

  const changeProvider = (id: string) => {
    setProviderId(id)
    setSelectedIds([])
  }
  const changeRange = (next: DateRange) => {
    setRange(next)
    setSelectedIds([])
  }
  const toggleSlot = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const bookSelected = () => {
    setSuccess(null)
    book.mutate(selectedIds, {
      onSuccess: (bookings) => {
        setSelectedIds([])
        setSuccess(
          `Booked ${bookings.length} slot${bookings.length === 1 ? '' : 's'}. See "My bookings" for details.`,
        )
      },
    })
  }

  if (providers.isPending) return <Spinner className="text-indigo-600" />
  if (providers.isError) return <Alert variant="error">{getErrorMessage(providers.error)}</Alert>
  if (providers.data.length === 0) {
    return <EmptyState title="No providers yet" description="Seed the database to add a demo provider." />
  }

  const selectedSlots = slots.data?.filter((slot) => selectedIds.includes(slot.id)) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book a slot"
        description="Pick one slot, or several back-to-back slots for a longer session."
      />

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <ProviderSelect providers={providers.data} value={activeProviderId} onChange={changeProvider} />
        <DateRangeFields value={range} onChange={changeRange} />
      </div>

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {book.isError && (
        <Alert variant="error" onDismiss={() => book.reset()}>
          {getErrorMessage(book.error)}
        </Alert>
      )}

      {slots.isPending && <Spinner className="text-indigo-600" />}
      {slots.isError && <Alert variant="error">{getErrorMessage(slots.error)}</Alert>}
      {slots.data && slots.data.length === 0 && (
        <EmptyState
          title="No available slots"
          description="Try a different provider or a wider date range."
        />
      )}
      {slots.data && slots.data.length > 0 && (
        <SlotGrid slots={slots.data} selectedIds={selectedIds} onToggle={toggleSlot} />
      )}

      <BookingBar
        selected={selectedSlots}
        isPending={book.isPending}
        onBook={bookSelected}
        onClear={() => setSelectedIds([])}
      />
    </div>
  )
}
