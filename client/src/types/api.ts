export type Role = 'CLIENT' | 'PROVIDER'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface Provider {
  id: string
  name: string
  email: string
}

export interface Slot {
  id: string
  providerId: string
  startAt: string
  endAt: string
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED'

export interface Booking {
  id: string
  status: BookingStatus
  createdAt: string
  cancelledAt: string | null
  slot: Slot & { provider: { id: string; name: string } }
}

export interface ProviderSlot extends Slot {
  booking: { id: string; client: { id: string; name: string; email: string } } | null
}

export interface ProviderBooking {
  id: string
  status: BookingStatus
  createdAt: string
  cancelledAt: string | null
  slot: { id: string; startAt: string; endAt: string }
  client: { id: string; name: string; email: string }
}

export interface SlotTimesInput {
  startAt: string
  endAt: string
}
