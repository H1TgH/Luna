import { api } from './client'
import type { ProfileCreateRequest, ProfileResponse } from '../types'

export const profileApi = {
  create: (data: ProfileCreateRequest) =>
    api.post<{ msg: string }>('/api/v1/user/profile', data),

  getMe: () =>
    api.get<ProfileResponse>('/api/v1/user/profile/me'),

  getByUsername: (username: string) =>
    api.get<ProfileResponse>(`/api/v1/user/profile/${username}`),

  update: (data: Partial<Omit<ProfileCreateRequest, 'username'>>) =>
    api.patch('/api/v1/user/profile/me', data),

  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.post('/api/v1/user/profile/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}