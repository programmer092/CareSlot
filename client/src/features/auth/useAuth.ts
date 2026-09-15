import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../../types/api'
import { authApi, type LoginInput, type RegisterInput } from './api'
import { clearStoredUser, ME_KEY, readStoredUser, writeStoredUser } from './session'

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ME_KEY,
    queryFn: readStoredUser,
    initialData: readStoredUser,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const remember = (next: User) => {
    writeStoredUser(next)
    queryClient.setQueryData(ME_KEY, next)
  }

  const login = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input).then(() => authApi.me()),
    onSuccess: remember,
  })
  const register = useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input).then(() => authApi.me()),
    onSuccess: remember,
  })
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearStoredUser()
      queryClient.setQueryData(ME_KEY, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' })
    },
  })

  return { user, login, register, logout }
}
