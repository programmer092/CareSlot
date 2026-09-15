import { api, unwrapPage } from '../../lib/api'
import type { PageParams, Provider, Slot } from '../../types/api'

export const slotsApi = {
  providers: () =>
    api.get<never>('/providers', { params: { page_size: 100 } }).then(unwrapPage<Provider>),
  available: (providerId: string, from: string, to: string, params: PageParams) =>
    api
      .get<never>(`/providers/${providerId}/slots`, { params: { from, to, ...params } })
      .then(unwrapPage<Slot>),
}
