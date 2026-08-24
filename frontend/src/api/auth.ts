import { api } from './client'

export const authApi = {
  register: (data: { email: string; password: string }) =>
    api.post<{ msg: string }>('/api/v1/users/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ msg: string }>('/api/v1/users/auth/login', data),

  refresh: () =>
    api.post<void>('/api/v1/users/auth/refresh'),

  logout: () =>
    api.post<void>('/api/v1/users/auth/logout'),

  confirmEmail: (token: string) =>
    api.post(`/api/v1/users/auth/confirm-email?token=${token}`),

  requestPasswordReset: (email: string) =>
    api.post('/api/v1/users/auth/reset-password/request', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post(`/api/v1/users/auth/reset-password?token=${token}`, { new_Password: new_password }),
}
