from dataclasses import dataclass
from datetime import datetime
from typing import BinaryIO
from uuid import UUID


@dataclass
class UploadImageDTO:
    file_name: str
    data: BinaryIO
    content_type: str


@dataclass
class PostImageDTO:
    object_key: str
    order: int


@dataclass
class PostCreationDTO:
    content: str | None = None


@dataclass
class PostReadDTO:
    id: UUID
    author_id: UUID
    created_at: datetime
    likes_count: int
    is_current_user_likes: bool
    content: str | None = None
    images: list[PostImageDTO] | None = None


@dataclass
class PostsPageDTO:
    posts: list[PostReadDTO]
    next_cursor: datetime | None
    has_next: bool
