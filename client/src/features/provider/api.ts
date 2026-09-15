import { api } from '../../lib/api'
import type { ProviderBooking, ProviderSlot, Slot, SlotTimesInput } from '../../types/api'

export const providerApi = {
  mySlots: (from: string, to: string) =>
    api.get<ProviderSlot[]>('/providers/me/slots', { params: { from, to } }).then((res) => res.data),
  createSlot: (input: SlotTimesInput) =>
    api.post<Slot>('/providers/me/slots', input).then((res) => res.data),
  updateSlot: ({ id, ...input }: SlotTimesInput & { id: string }) =>
    api.patch<Slot>(`/providers/me/slots/${id}`, input).then((res) => res.data),
  deleteSlot: (id: string) => api.delete(`/providers/me/slots/${id}`).then(() => undefined),
  myBookings: () => api.get<ProviderBooking[]>('/providers/me/bookings').then((res) => res.data),
}
