import { useQuery } from '@tanstack/react-query'
import { slotsApi } from './api'

export const useProviders = () =>
  useQuery({ queryKey: ['providers'], queryFn: slotsApi.providers })

export const useAvailableSlots = (providerId: string, from: string, to: string) =>
  useQuery({
    queryKey: ['slots', providerId, from, to],
    queryFn: () => slotsApi.available(providerId, from, to),
    enabled: providerId !== '',
  })
