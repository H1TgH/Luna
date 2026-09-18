import { api } from './client'
import type { ChatPageResponse, MessageHistoryResponse, ChatMessageResponse, ProfileResponse } from '../types'
import { prepareImageForUpload } from '../utils/imageUpload'

export const chatApi = {
  createPersonal: (userId: string) =>
      api.post<{ id: string }>('/api/v1/chat/', (() => {
        const f = new FormData()
        f.append('is_group', 'false')
        f.append('name', '')
        f.append('user_ids', userId)
        return f
      })()),

    createGroup: async (name: string, userIds: string[], avatar?: File) => {
      const f = new FormData()
      f.append('is_group', 'true')
      f.append('name', name)
      userIds.forEach(id => f.append('user_ids', id))
      if (avatar) {
        const prepared = await prepareImageForUpload(avatar, { maxEdge: 1024, quality: 0.85 })
        f.append('chat_avatar', prepared)
      }
      return api.post<{ id: string }>('/api/v1/chat/', f, { timeout: 60_000 })
    },

  getChats: (cursor?: string, limit = 20) =>
    api.get<ChatPageResponse>('/api/v1/chat/', {
      params: { ...(cursor ? { cursor } : {}), limit },
    }),

  getHistory: (chatId: string, cursor?: string, limit = 50) =>
    api.get<MessageHistoryResponse>(`/api/v1/chat/${chatId}`, {
      params: { ...(cursor ? { cursor } : {}), limit },
    }),

  sendMessage: (
    chatId: string,
    content: string,
    opts?: { parent_id?: string | null; forwarded_from?: string | null },
  ) =>
    api.post<ChatMessageResponse>('/api/v1/chat/message', {
      chat_id: chatId,
      content,
      ...(opts?.parent_id ? { parent_id: opts.parent_id } : {}),
      ...(opts?.forwarded_from ? { forwarded_from: opts.forwarded_from } : {}),
    }),

  editMessage: (messageId: string, content: string) =>
    api.patch(`/api/v1/chat/message/${messageId}`, { content }),

  deleteForMe: (messageId: string) =>
    api.delete(`/api/v1/chat/message/${messageId}/me`),

  deleteForAll: (messageId: string) =>
    api.delete(`/api/v1/chat/message/${messageId}/all`),

  markAsRead: (chatId: string, messageId: string) =>
    api.patch(`/api/v1/chat/${chatId}/${messageId}/read`),

  getParticipants: (chatId: string, limit = 20, offset = 0) =>
    api.get<ProfileResponse[]>(`/api/v1/user/profile/${chatId}/participants`, {
      params: { limit, offset },
    }),

  searchParticipants: (chatId: string, query: string, limit = 20, offset = 0) =>
    api.get<ProfileResponse[]>(`/api/v1/user/profile/${chatId}/participants/search`, {
      params: { query, limit, offset },
    }),

  updateChatName: (chatId: string, name: string) =>
    api.patch(`/api/v1/chat/${chatId}`, { name }),

  updateChatAvatar: async (chatId: string, avatar: File) => {
    const prepared = await prepareImageForUpload(avatar, { maxEdge: 1024, quality: 0.85 })
    const f = new FormData()
    f.append('avatar', prepared)
    return api.patch<{ avatar_url: string }>(`/api/v1/chat/${chatId}/avatar`, f, {
      timeout: 60_000,
    })
  },

  inviteUser: (chatId: string, userId: string) =>
    api.post(`/api/v1/chat/${chatId}/participants/${userId}`),

  kickUser: (chatId: string, userId: string) =>
    api.delete(`/api/v1/chat/${chatId}/participants/${userId}`),
}
