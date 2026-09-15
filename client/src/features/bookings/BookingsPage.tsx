import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../lib/api'
import type { Booking } from '../../types/api'
import { BookingCard } from './BookingCard'
import { useCancelBooking, useMyBookings } from './hooks'

export function BookingsPage() {
  const [page, setPage] = useState(1)
  const bookings = useMyBookings(page)
  const cancel = useCancelBooking()
  const [success, setSuccess] = useState<string | null>(null)

  const cancelBooking = (id: string) => {
    setSuccess(null)
    cancel.mutate(id, { onSuccess: () => setSuccess('Booking cancelled. The slot is available again.') })
  }

  if (bookings.isPending) return <Spinner className="text-indigo-600" />
  if (bookings.isError) return <Alert variant="error">{getErrorMessage(bookings.error)}</Alert>

  const confirmed = bookings.data.items.filter((b) => b.status === 'CONFIRMED')
  const cancelled = bookings.data.items.filter((b) => b.status === 'CANCELLED')

  return (
    <div className="space-y-6">
      <PageHeader
        title="My bookings"
        description={`${confirmed.length} upcoming appointment${confirmed.length === 1 ? '' : 's'}.`}
      />

      {success && (
        <Alert variant="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {cancel.isError && (
        <Alert variant="error" onDismiss={() => cancel.reset()}>
          {getErrorMessage(cancel.error)}
        </Alert>
      )}

      {bookings.data.items.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Browse a provider's availability and book your first slot."
          action={
            <Link to="/">
              <Button>Find a slot</Button>
            </Link>
          }
        />
      ) : (
        <>
          <BookingList
            title="Confirmed"
            bookings={confirmed}
            cancellingId={cancel.isPending ? cancel.variables : undefined}
            onCancel={cancelBooking}
          />
          <BookingList title="Cancelled" bookings={cancelled} onCancel={cancelBooking} />
          <Pagination meta={bookings.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

interface BookingListProps {
  title: string
  bookings: Booking[]
  cancellingId?: string
  onCancel: (id: string) => void
}

function BookingList({ title, bookings, cancellingId, onCancel }: BookingListProps) {
  if (bookings.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title} ({bookings.length})
      </h2>
      <ul className="space-y-2">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            isCancelling={cancellingId === booking.id}
            onCancel={onCancel}
          />
        ))}
      </ul>
    </section>
  )
}
