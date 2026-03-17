import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = accessToken
  return config
})

let isRefreshing = false
let queue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthRoute = original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !isAuthRoute && !original._retry) {
      original._retry = true
      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState()

      if (!refreshToken) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = token
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const { data } = await api.post('/api/v1/users/auth/refresh', { token: refreshToken })
        const newAccess = data.token
        setTokens(newAccess, refreshToken)
        queue.forEach((cb) => cb(newAccess))
        queue = []
        original.headers.Authorization = newAccess
        return api(original)
      } catch {
        clearTokens()
        queue = []
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status === 403 && !isAuthRoute) {
      window.location.href = '/confirm-email-pending'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)