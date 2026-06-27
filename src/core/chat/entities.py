from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from core.chat.enums import MessageTypeEnum


@dataclass
class ChatCreationDTO:
    is_group: bool
    name: str | None
    users_ids: tuple[UUID, ...]
    creator_id: UUID | None = None


@dataclass
class MessageSenderDTO:
    sender_id: UUID | None
    username: str
    first_name: str
    last_name: str
    avatar_key: str | None


@dataclass
class MessageCreationDTO:
    sender_id: UUID | None
    chat_id: UUID
    content: str
    type: MessageTypeEnum


@dataclass
class MessageDTO:
    id: UUID
    sender: MessageSenderDTO | None
    content: str
    type: MessageTypeEnum
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    edited_at: datetime | None


@dataclass
class ChatDTO:
    id: UUID
    is_group: bool
    last_message: MessageDTO | None
    is_mark_unread: bool
    name: str | None
    avatar_url: str | None
    unread_count: int
    created_at: datetime


@dataclass
class ChatInfoDTO:
    id: UUID
    is_group: bool
    name: str | None = None
    username: str | None = None
    avatar_url: str | None = None


@dataclass
class MessageHistoryDTO:
    chat: ChatInfoDTO
    messages: list[MessageDTO]
    last_read_message_id: UUID | None
    has_next: bool
    next_cursor: datetime | None


@dataclass
class ChatPageDTO:
    chats: list[ChatDTO]
    has_next: bool
    next_cursor: datetime | None


@dataclass
class MessageUpdateDTO:
    content: str
