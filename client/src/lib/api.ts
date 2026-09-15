import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the server. Is the API running?'
    const message: unknown = error.response.data?.message
    if (Array.isArray(message)) return message.join('. ')
    if (typeof message === 'string') return message
  }
  return 'Something went wrong. Please try again.'
}
