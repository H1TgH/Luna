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
}

export interface PostsPageResponse {
  posts: PostResponse[]
  next_cursor: string | null
  has_next: boolean
}