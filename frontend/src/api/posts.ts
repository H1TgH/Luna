import { api } from './client'
import type { PostResponse, PostsPageResponse } from '../types'
import { prepareImageForUpload } from '../utils/imageUpload'

export interface ImageItem {
  post_id: string
  object_key: string
  created_at: string
}

export const postsApi = {
  create: async (data: { content?: string; images?: File[] }) => {
    const formData = new FormData()
    if (data.content) formData.append('content', data.content)
    if (data.images) {
      const prepared = await Promise.all(
        data.images.map((img) => prepareImageForUpload(img, { maxEdge: 2048, quality: 0.85 })),
      )
      prepared.forEach((img) => formData.append('images', img))
    }
    // Do not set Content-Type — browser must add multipart boundary
    return api.post<PostResponse>('/api/v1/posts/', formData, { timeout: 120_000 })
  },

  getByUser: (profileId: string, cursor?: string, limit = 25) =>
    api.get<PostsPageResponse>(`/api/v1/posts/user/${profileId}`, {
      params: { cursor, limit },
    }),

  getMe: (cursor?: string, limit = 25) =>
    api.get<PostsPageResponse>('/api/v1/posts/me', {
      params: { cursor, limit },
    }),

  getById: (id: string) =>
    api.get<PostResponse>(`/api/v1/posts/${id}`),

  getUserImages: (profileId: string, cursor?: string, limit = 25) =>
    api.get<ImageItem[]>(`/api/v1/posts/images/${profileId}`, {
      params: { cursor, limit },
    }),

  delete: (id: string) =>
    api.delete(`/api/v1/posts/${id}`),

  like: (id: string) =>
    api.post(`/api/v1/posts/${id}/like`),

  unlike: (id: string) =>
    api.delete(`/api/v1/posts/${id}/like`),
}