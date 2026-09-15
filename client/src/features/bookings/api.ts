import { api, unwrap, unwrapPage } from '../../lib/api'
import type { Booking, PageParams } from '../../types/api'

export const bookingsApi = {
  mine: (params: PageParams) =>
    api.get<never>('/bookings/me', { params }).then(unwrapPage<Booking>),
  create: (slotIds: string[]) =>
    api.post<never>('/bookings', { slotIds }).then(unwrap<Booking[]>),
  cancel: (bookingId: string) =>
    api.patch<never>(`/bookings/${bookingId}/cancel`).then(unwrap<Booking>),
}
