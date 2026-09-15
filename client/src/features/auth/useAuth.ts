import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../../types/api'
import { authApi } from './api'

const ME_KEY = ['me'] as const

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user = null, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => authApi.me().catch(() => null),
  })

  const setUser = (next: User | null) => queryClient.setQueryData(ME_KEY, next)

  const login = useMutation({ mutationFn: authApi.login, onSuccess: setUser })
  const register = useMutation({ mutationFn: authApi.register, onSuccess: setUser })
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      setUser(null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
    },
  })

  return { user, isLoading, login, register, logout }
}
