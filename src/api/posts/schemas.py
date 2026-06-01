from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PostImageSchema(BaseModel):
    object_key: str
    order: int


class PostReadSchema(BaseModel):
    id: UUID
    author_id: UUID
    created_at: datetime
    likes_count: int
    is_current_user_likes: bool
    comments_count: int
    content: str | None = None
    images: list[PostImageSchema] | None = None


class PostPageSchema(BaseModel):
    posts: list[PostReadSchema]
    next_cursor: datetime | None
    has_next: bool


class ImageSchema(BaseModel):
    post_id: UUID
    object_key: str
    created_at: datetime


class CommentCreationSchema(BaseModel):
    parent_id: UUID | None
    text: str


class CommentAuthorSchema(BaseModel):
    author_id: UUID
    username: str
    first_name: str
    last_name: str
    avatar_url: str | None


class CommentSchema(BaseModel):
    id: UUID
    author: CommentAuthorSchema
    post_id: UUID
    parent_id: UUID | None
    text: str
    root_comment_id: UUID | None
    created_at: datetime
    replies_count: int = 0


class CommentsPageSchema(BaseModel):
    comments: list[CommentSchema]
    next_cursor: datetime | None
    has_next: bool
