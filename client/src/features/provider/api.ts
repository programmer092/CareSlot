import { api, unwrap, unwrapPage } from '../../lib/api'
import type { PageParams, ProviderBooking, ProviderSlot, Slot, SlotTimesInput } from '../../types/api'

export const providerApi = {
  mySlots: (from: string, to: string, params: PageParams) =>
    api
      .get<never>('/providers/me/slots', { params: { from, to, ...params } })
      .then(unwrapPage<ProviderSlot>),
  createSlot: (input: SlotTimesInput) =>
    api.post<never>('/providers/me/slots', input).then(unwrap<Slot>),
  updateSlot: ({ id, ...input }: SlotTimesInput & { id: string }) =>
    api.patch<never>(`/providers/me/slots/${id}`, input).then(unwrap<Slot>),
  deleteSlot: (id: string) => api.delete(`/providers/me/slots/${id}`).then(() => undefined),
  myBookings: (params: PageParams & { search?: string }) =>
    api.get<never>('/providers/me/bookings', { params }).then(unwrapPage<ProviderBooking>),
}
