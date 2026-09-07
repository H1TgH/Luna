from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from core.chat.enums import MessageTypeEnum


class MessageSenderSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sender_id: UUID | None
    username: str
    first_name: str
    last_name: str
    avatar_key: str | None


class MessageCreationSchema(BaseModel):
    chat_id: UUID
    content: str


class MessageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender: UUID | MessageSenderSchema | None
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
    participants_count: int | None
    online_participants_count: int | None
    username: str | None
    avatar_url: str | None
    is_online: bool | None
    last_seen: datetime | None


class MessageHistorySchema(BaseModel):
    chat: ChatInfoSchema
    messages: list[MessageSchema]
    profiles: list[MessageSenderSchema]
    last_read_message_id: UUID | None
    own_last_read_message_id: UUID | None
    peer_last_read_message_id: UUID | None
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


class ChatInfoUpdateSchema(BaseModel):
    name: str


class ChatAvatarUpdateResponseSchema(BaseModel):
    avatar_url: str
