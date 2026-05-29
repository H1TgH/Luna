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
class CommentReadDTO:
    id: UUID
    post_id: UUID
    author_id: CommentAuthorDTO
    parent_id: UUID | None
    root_comment_id: UUID | None
    text: str
    created_at: datetime


@dataclass
class CommentListItemDTO:
    id: UUID
    post_id: UUID
    author: CommentAuthorDTO
    parent_id: UUID | None
    text: str
    created_at: datetime
    reply_count: int
    has_replies: bool


@dataclass
class CommentReplyDTO:
    id: UUID
    post_id: UUID
    author: CommentAuthorDTO
    parent_id: UUID | None
    root_comment_id: UUID | None
    text: str
    created_at: datetime


@dataclass
class CommentsPageDTO:
    comments: list[CommentListItemDTO]
    next_cursor: datetime | None
    has_next: bool


@dataclass
class CommentsReplyPageDTO:
    comments: list[CommentReplyDTO]
    next_cursor: datetime | None
    has_next: bool
