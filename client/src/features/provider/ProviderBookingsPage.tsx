import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../lib/api'
import { formatDate, formatDay, formatDuration, formatTimeRange } from '../../lib/format'
import type { ProviderBooking } from '../../types/api'
import { useProviderBookings } from './hooks'

export function ProviderBookingsPage() {
  const bookings = useProviderBookings()

  if (bookings.isPending) return <Spinner className="text-indigo-600" />
  if (bookings.isError) return <Alert variant="error">{getErrorMessage(bookings.error)}</Alert>

  const now = new Date()
  const upcoming = bookings.data.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.slot.startAt) > now,
  )
  const past = bookings.data.filter((b) => !upcoming.includes(b))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description={`${upcoming.length} upcoming appointment${upcoming.length === 1 ? '' : 's'}.`}
      />

      {bookings.data.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Bookings clients make on your slots will show up here."
        />
      ) : (
        <>
          <BookingSection title="Upcoming" bookings={upcoming} />
          <BookingSection title="Past & cancelled" bookings={past} />
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
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 bg-white p-4 ${
              booking.status === 'CONFIRMED' ? 'border-l-green-500' : 'border-l-gray-300'
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
