import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { Spinner } from '../../components/ui/Spinner'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getErrorMessage } from '../../lib/api'
import { formatDate, formatDay, formatDuration, formatTimeRange } from '../../lib/format'
import type { ProviderBooking } from '../../types/api'
import { useProviderBookings } from './hooks'

export function ProviderBookingsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [page, setPage] = useState(1)
  const bookings = useProviderBookings(debouncedSearch, page)

  const now = new Date()
  const upcoming = (bookings.data?.items ?? []).filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.slot.startAt) > now,
  )
  const past = (bookings.data?.items ?? []).filter((b) => !upcoming.includes(b))

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" description="Appointments clients have made on your slots." />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <Input
          label="Search by client name"
          type="search"
          placeholder="e.g. Bikash"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {bookings.isPending && <Spinner className="text-indigo-600" />}
      {bookings.isError && <Alert variant="error">{getErrorMessage(bookings.error)}</Alert>}

      {bookings.data && bookings.data.items.length === 0 && (
        <EmptyState
          title={search ? `No bookings for "${search}"` : 'No bookings yet'}
          description={
            search ? 'Try a different name.' : 'Bookings clients make on your slots will show up here.'
          }
        />
      )}

      {bookings.data && bookings.data.items.length > 0 && (
        <>
          <BookingSection title="Upcoming" bookings={upcoming} />
          <BookingSection title="Past & cancelled" bookings={past} />
          <Pagination meta={bookings.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

function BookingSection({ title, bookings }: { title: string; bookings: ProviderBooking[] }) {
  if (bookings.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title} ({bookings.length})
      </h2>
      <ul className="space-y-2">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-4 ${booking.status === 'CONFIRMED' ? 'border-l-green-500' : 'border-l-gray-300'
              }`}
          >
            <div>
              <p className="font-medium text-gray-900">
                {formatDay(booking.slot.startAt)} · {formatTimeRange(booking.slot.startAt, booking.slot.endAt)}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {formatDuration(booking.slot.startAt, booking.slot.endAt)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                {booking.client.name} · {booking.client.email}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Booked {formatDate(booking.createdAt)}
                {booking.cancelledAt && ` · cancelled ${formatDate(booking.cancelledAt)}`}
              </p>
            </div>
            <Badge value={booking.status} />
          </li>
        ))}
      </ul>
    </section>
  )
}
