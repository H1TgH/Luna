import { api } from './client'
import type { CommentResponse, CommentsPageResponse } from '../types'

export const commentsApi = {
  getForPost: (postId: string, cursor?: string, limit = 20) =>
    api.get<CommentsPageResponse>(`/api/v1/posts/comments/${postId}/root`, {
      params: { cursor, limit },
    }),

  getReplies: (commentId: string, cursor?: string, limit = 15) =>
    api.get<CommentsPageResponse>(`/api/v1/posts/comments/${commentId}/thread`, {
      params: { cursor, limit },
    }),

  create: (postId: string, text: string, parentId?: string | null) =>
    api.post<CommentResponse>(`/api/v1/posts/${postId}/comments`, {
      text,
      parent_id: parentId ?? null,
    }),
}
