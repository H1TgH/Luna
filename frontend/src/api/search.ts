import { api } from './client'
import type { ProfileResponse } from '../types'

export const searchApi = {
  profiles: (query: string, limit = 15, offset = 0) =>
    api.get<ProfileResponse[]>('/api/v1/user/profile/search', {
      params: { query, limit, offset },
    }),

  interlocutors: (query = '', limit = 15, offset = 0) =>
    api.get<ProfileResponse[]>('/api/v1/user/profile/search/interlocutors', {
      params: { query, limit, offset },
    }),
}