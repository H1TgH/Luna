from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class PostImageSchema(BaseModel):
    object_key: str
    order: int


class PostReadSchema(BaseModel):
    author_id: UUID
    created_at: datetime
    likes_count: int
    is_current_user_likes: bool
    content: str | None = None
    images: list[PostImageSchema] | None = None


class PostPageSchema(BaseModel):
    posts: list[PostReadSchema]
    next_cursor: datetime | None
    has_next: bool
