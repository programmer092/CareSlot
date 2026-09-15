import axios, { type AxiosResponse } from 'axios'
import type { ApiEnvelope, Page } from '../types/api'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

export const unwrap = <T>(res: AxiosResponse<ApiEnvelope<T>>): T => res.data.data

export const unwrapPage = <T>(res: AxiosResponse<ApiEnvelope<T[]>>): Page<T> => ({
  items: res.data.data,
  meta: res.data.meta_data ?? { page: 1, page_size: res.data.data.length, hasNext: false, hasPrevious: false },
})

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiEnvelope<null>>(error)) {
    if (!error.response) return 'Cannot reach the server. Is the API running?'
    if (error.response.data?.error) return error.response.data.error
  }
  return 'Something went wrong. Please try again.'
}
