import { api } from '../../lib/api'
import type { Booking } from '../../types/api'

export const bookingsApi = {
  mine: () => api.get<Booking[]>('/bookings/me').then((res) => res.data),
  create: (slotIds: string[]) =>
    api.post<Booking[]>('/bookings', { slotIds }).then((res) => res.data),
  cancel: (bookingId: string) =>
    api.patch<Booking>(`/bookings/${bookingId}/cancel`).then((res) => res.data),
}
