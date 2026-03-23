import { api } from './client'
import type { TokensResponse } from '../types'

export const authApi = {
  register: (data: { email: string; password: string }) =>
    api.post<{ msg: string }>('/api/v1/users/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<TokensResponse>('/api/v1/users/auth/login', data),

  refresh: (token: string) =>
    api.post<{ token: string }>('/api/v1/users/auth/refresh', { token }),

  confirmEmail: (token: string) =>
    api.post(`/api/v1/users/auth/confirm-email?token=${token}`),

  requestPasswordReset: (email: string) =>
    api.post('/api/v1/users/auth/reset-password/request', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post(`/api/v1/users/auth/reset-password?token=${token}`, { new_Password: new_password }),
}