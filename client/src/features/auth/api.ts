import { api } from '../../lib/api'
import type { User } from '../../types/api'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export const authApi = {
  me: () => api.get<User>('/auth/me').then((res) => res.data),
  login: (input: LoginInput) =>
    api.post<{ user: User }>('/auth/login', input).then((res) => res.data.user),
  register: (input: RegisterInput) =>
    api.post<{ user: User }>('/auth/register', input).then((res) => res.data.user),
  logout: () => api.post('/auth/logout').then(() => undefined),
}
