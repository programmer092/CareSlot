import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from './api'

const BOOKINGS_KEY = ['bookings'] as const

export const useMyBookings = () =>
  useQuery({ queryKey: BOOKINGS_KEY, queryFn: bookingsApi.mine })

function useRefreshAfterChange() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
    void queryClient.invalidateQueries({ queryKey: ['slots'] })
  }
}

export function useBookSlots() {
  const refresh = useRefreshAfterChange()
  return useMutation({ mutationFn: bookingsApi.create, onSuccess: refresh })
}

export function useCancelBooking() {
  const refresh = useRefreshAfterChange()
  return useMutation({ mutationFn: bookingsApi.cancel, onSuccess: refresh })
}
