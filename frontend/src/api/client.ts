import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '/',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// FormData must get multipart + boundary from the browser — not the JSON default above
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    const headers = config.headers
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type')
    } else if (headers) {
      delete headers['Content-Type']
    }
  }
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = []

const isAuthRoute = (url?: string) =>
  !!url && (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  )

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !isAuthRoute(original?.url) && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(() => api(original))
      }

      isRefreshing = true
      try {
        await api.post('/api/v1/users/auth/refresh')
        queue.forEach(({ resolve }) => resolve())
        queue = []
        return api(original)
      } catch (refreshError) {
        queue.forEach(({ reject }) => reject(refreshError))
        queue = []
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403 && !isAuthRoute(original?.url)) {
      window.location.href = '/confirm-email-pending'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)
