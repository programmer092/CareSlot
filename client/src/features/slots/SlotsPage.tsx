import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { DateRangeFields } from '../../components/ui/DateRangeFields'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
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
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const providers = useProviders()
  const activeProviderId = providerId || providers.data?.items[0]?.id || ''
  const slots = useAvailableSlots(
    activeProviderId,
    dateInputToIso(range.from),
    dateInputToIso(range.to, true),
    page,
  )
  const book = useBookSlots()

  const changeProvider = (id: string) => {
    setProviderId(id)
    setPage(1)
    setSelectedIds([])
  }
  const changeRange = (next: DateRange) => {
    setRange(next)
    setPage(1)
    setSelectedIds([])
  }
  const changePage = (next: number) => {
    setPage(next)
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
  if (providers.data.items.length === 0) {
    return <EmptyState title="No providers yet" description="Seed the database to add a demo provider." />
  }

  const selectedSlots = slots.data?.items.filter((slot) => selectedIds.includes(slot.id)) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book a slot"
        description="Pick one slot, or several back-to-back slots for a longer session."
      />

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <ProviderSelect providers={providers.data.items} value={activeProviderId} onChange={changeProvider} />
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
      {slots.data && slots.data.items.length === 0 && (
        <EmptyState
          title="No available slots"
          description="Try a different provider or a wider date range."
        />
      )}
      {slots.data && slots.data.items.length > 0 && (
        <>
          <SlotGrid slots={slots.data.items} selectedIds={selectedIds} onToggle={toggleSlot} />
          <Pagination meta={slots.data.meta} onPageChange={changePage} />
        </>
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
