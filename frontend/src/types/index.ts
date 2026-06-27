export interface TokensResponse {
  access_token: string
  refresh_token: string
}

export interface ProfileResponse {
  id: string
  username: string
  first_name: string
  last_name: string
  gender: 'Male' | 'Female'
  birth_date: string
  avatar_url: string | null
  status: string | null
  last_seen: string
}

export interface ProfileCreateRequest {
  username: string
  first_name: string
  last_name: string
  birth_date: string
  gender: 'Male' | 'Female'
}

export interface PostImageResponse {
  object_key: string
  order: number
}

export interface PostResponse {
  id: string
  author_id: string
  created_at: string
  likes_count: number
  is_current_user_likes: boolean
  content: string | null
  images: PostImageResponse[] | null
  comments_count: number
}

export interface PostsPageResponse {
  posts: PostResponse[]
  next_cursor: string | null
  has_next: boolean
}

export interface CommentAuthorResponse {
  id: string
  username: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export interface CommentResponse {
  id: string
  post_id: string
  author_id: string
  parent_id: string | null
  root_comment_id: string | null
  text: string
  created_at: string
  reply_count: number
  has_replies: boolean
  author: CommentAuthorResponse
}

export interface CommentsPageResponse {
  comments: CommentResponse[]
  next_cursor: string | null
  has_next: boolean
}

export type MessageType = 'System' | 'User'

export interface MessageSenderChatResponse {
  sender_id: string | null
  username: string
  first_name: string
  last_name: string
  avatar_key: string | null
}

export interface ChatMessageResponse {
  id: string
  sender: MessageSenderChatResponse | null
  content: string
  type: MessageType
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  edited_at: string | null
}

export interface ChatInfoResponse {
  id: string
  is_group: boolean
  name: string | null
  avatar_url: string | null
  username?: string | null
}

export interface ChatResponse {
  id: string
  last_message: ChatMessageResponse | null
  is_mark_unread: boolean
  is_group: boolean
  name: string | null
  avatar_url: string | null
  unread_count: number
  created_at: string
}

export interface ChatPageResponse {
  chats: ChatResponse[]
  has_next: boolean
  next_cursor: string | null
}

export interface MessageHistoryResponse {
  chat: ChatInfoResponse
  messages: ChatMessageResponse[]
  last_read_message_id: string | null
  has_next: boolean
  next_cursor: string | null
}