import { api } from '../../lib/api'
import type { Provider, Slot } from '../../types/api'

export const slotsApi = {
  providers: () => api.get<Provider[]>('/providers').then((res) => res.data),
  available: (providerId: string, from: string, to: string) =>
    api
      .get<Slot[]>(`/providers/${providerId}/slots`, { params: { from, to } })
      .then((res) => res.data),
}
