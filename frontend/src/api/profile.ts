import { api } from './client'
import type { ProfileCreateRequest, ProfileResponse } from '../types'
import { prepareImageForUpload } from '../utils/imageUpload'

export const profileApi = {
  create: (data: ProfileCreateRequest) =>
    api.post<{ msg: string }>('/api/v1/user/profile', data),

  getMe: () =>
    api.get<ProfileResponse>('/api/v1/user/profile/me'),

  getByUsername: (username: string) =>
    api.get<ProfileResponse>(`/api/v1/user/profile/${username}`),

  update: (data: Partial<Omit<ProfileCreateRequest, 'username'>>) =>
    api.patch('/api/v1/user/profile/me', data),

  uploadAvatar: async (file: File) => {
    const prepared = await prepareImageForUpload(file, { maxEdge: 1024, quality: 0.85 })
    const formData = new FormData()
    formData.append('avatar', prepared)
    // Do not set Content-Type — browser must add multipart boundary
    return api.post('/api/v1/user/profile/me/avatar', formData, { timeout: 60_000 })
  },
}