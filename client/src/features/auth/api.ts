import { api, unwrap } from '../../lib/api'
import type { User } from '../../types/api'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  name: string
}

export const authApi = {
  me: () => api.get<never>('/auth/me').then(unwrap<User>),
  login: (input: LoginInput) =>
    api.post<never>('/auth/login', input).then(unwrap<{ user: User }>).then((d) => d.user),
  register: (input: RegisterInput) =>
    api.post<never>('/auth/register', input).then(unwrap<{ user: User }>).then((d) => d.user),
  logout: () => api.post('/auth/logout').then(() => undefined),
}
