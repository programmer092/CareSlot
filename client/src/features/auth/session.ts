import type { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../lib/api'
import type { User } from '../../types/api'

export const ME_KEY = ['me'] as const

const STORAGE_KEY = 'careslot.user'

export function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as Partial<User>
    return user.id && user.email && user.name && user.role ? (user as User) : null
  } catch {
    return null
  }
}

export function writeStoredUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    return;
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    return;
  }
}

const CREDENTIAL_ROUTES = ['/auth/login', '/auth/register']


export function installSessionGuard(queryClient: QueryClient): void {
  api.interceptors.response.use(undefined, (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !CREDENTIAL_ROUTES.some((route) => error.config?.url?.endsWith(route))
    ) {
      clearStoredUser()
      queryClient.setQueryData(ME_KEY, null)
    }
    return Promise.reject(error)
  })
}
