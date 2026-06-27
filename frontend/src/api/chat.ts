import { api } from './client'
import type { ChatPageResponse, MessageHistoryResponse, ChatMessageResponse } from '../types'

export const chatApi = {
  createOrGet: (data: { is_group: boolean; name: string | null; users_ids: string[] }) =>
    api.post<{ id: string }>('/api/v1/chat/', data),

  getChats: (cursor?: string, limit = 20) =>
    api.get<ChatPageResponse>('/api/v1/chat/', {
      params: { ...(cursor ? { cursor } : {}), limit },
    }),

  getHistory: (chatId: string, cursor?: string, limit = 50) =>
    api.get<MessageHistoryResponse>(`/api/v1/chat/${chatId}`, {
      params: { ...(cursor ? { cursor } : {}), limit },
    }),

  sendMessage: (chatId: string, content: string) =>
    api.post<ChatMessageResponse>('/api/v1/chat/message', { chat_id: chatId, content }),

  editMessage: (messageId: string, content: string) =>
    api.patch(`/api/v1/chat/message/${messageId}`, { content }),

  deleteForMe: (messageId: string) =>
    api.delete(`/api/v1/chat/message/${messageId}/me`),

  deleteForAll: (messageId: string) =>
    api.delete(`/api/v1/chat/message/${messageId}/all`),

  markAsRead: (chatId: string, messageId: string) =>
    api.patch(`/api/v1/chat/${chatId}/${messageId}/read`),
}