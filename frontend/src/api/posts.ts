import { api } from './client'
import type { PostResponse, PostsPageResponse } from '../types'

export interface ImageItem {
  post_id: string
  object_key: string
  created_at: string
}

export const postsApi = {
  create: (data: { content?: string; images?: File[] }) => {
    const formData = new FormData()
    if (data.content) formData.append('content', data.content)
    if (data.images) {
      data.images.forEach((img) => formData.append('images', img))
    }
    return api.post<PostResponse>('/api/v1/posts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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