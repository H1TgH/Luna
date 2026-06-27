from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from core.chat.enums import MessageTypeEnum


class MessageSenderSchema(BaseModel):
    sender_id: UUID | None
    username: str
    first_name: str
    last_name: str
    avatar_key: str | None


class MessageCreationSchema(BaseModel):
    chat_id: UUID
    content: str


class MessageSchema(BaseModel):
    id: UUID
    sender: MessageSenderSchema | None
    content: str
    type: MessageTypeEnum
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    edited_at: datetime | None


class ChatSchema(BaseModel):
    id: UUID
    last_message: MessageSchema | None
    is_mark_unread: bool
    is_group: bool
    name: str | None
    avatar_url: str | None
    unread_count: int
    created_at: datetime


class ChatInfoSchema(BaseModel):
    id: UUID
    is_group: bool
    name: str | None
    username: str | None
    avatar_url: str | None


class MessageHistorySchema(BaseModel):
    chat: ChatInfoSchema
    messages: list[MessageSchema]
    last_read_message_id: UUID | None
    has_next: bool
    next_cursor: datetime | None


class ChatCreationSchema(BaseModel):
    is_group: bool
    name: str | None
    users_ids: tuple[UUID, ...]


class ChatPageSchema(BaseModel):
    chats: list[ChatSchema]
    has_next: bool
    next_cursor: datetime | None


class MessageUpdateSchema(BaseModel):
    content: str
