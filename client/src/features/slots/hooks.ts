import { useQuery } from '@tanstack/react-query'
import { slotsApi } from './api'

export const useProviders = () =>
  useQuery({ queryKey: ['providers'], queryFn: slotsApi.providers })

export const useAvailableSlots = (providerId: string, from: string, to: string, page: number) =>
  useQuery({
    queryKey: ['slots', providerId, from, to, page],
    queryFn: () => slotsApi.available(providerId, from, to, { page }),
    enabled: providerId !== '',
  })
