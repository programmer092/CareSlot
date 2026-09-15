import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { providerApi } from './api'

const SLOTS_KEY = ['provider-slots'] as const
const BOOKINGS_KEY = ['provider-bookings'] as const

export const useMySlots = (from: string, to: string, page: number) =>
  useQuery({
    queryKey: [...SLOTS_KEY, from, to, page],
    queryFn: () => providerApi.mySlots(from, to, { page }),
  })

export const useProviderBookings = (search: string, page: number) =>
  useQuery({
    queryKey: [...BOOKINGS_KEY, search, page],
    queryFn: () => providerApi.myBookings({ search: search || undefined, page }),
  })

function useRefreshSlots() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: SLOTS_KEY })
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
  }
}

export function useCreateSlot() {
  const refresh = useRefreshSlots()
  return useMutation({ mutationFn: providerApi.createSlot, onSuccess: refresh })
}

export function useUpdateSlot() {
  const refresh = useRefreshSlots()
  return useMutation({ mutationFn: providerApi.updateSlot, onSuccess: refresh })
}

export function useDeleteSlot() {
  const refresh = useRefreshSlots()
  return useMutation({ mutationFn: providerApi.deleteSlot, onSuccess: refresh })
}
