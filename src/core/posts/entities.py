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
    comments_count: int
    content: str | None = None
    images: list[PostImageDTO] | None = None


@dataclass
class PostsPageDTO:
    posts: list[PostReadDTO]
    next_cursor: datetime | None
    has_next: bool


@dataclass
class ImageDTO:
    post_id: UUID
    object_key: str
    created_at: datetime


@dataclass
class CommentCreationDTO:
    author_id: UUID
    post_id: UUID
    parent_id: UUID | None
    text: str


@dataclass
class CommentAuthorDTO:
    author_id: UUID
    username: str
    first_name: str
    last_name: str
    avatar_url: str | None


@dataclass
class CommentDTO:
    id: UUID
    author: CommentAuthorDTO
    post_id: UUID
    parent_id: UUID | None
    text: str
    root_comment_id: UUID | None
    created_at: datetime
    replies_count: int = 0
    has_replies: bool = False


@dataclass
class CommentsPageDTO:
    comments: list[CommentDTO]
    next_cursor: datetime | None
    has_next: bool
