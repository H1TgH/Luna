from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from core.chat.enums import MessageTypeEnum


class NewMessageEvent(BaseModel):
    parent_id: UUID | None = None
    forwarded_from: UUID | None = None
    content: str


class EditMessageEvent(BaseModel):
    message_id: UUID
    content: str


class DeleteForMeEvent(BaseModel):
    message_id: UUID


class DeleteForAllEvent(BaseModel):
    message_id: UUID


class MessageReadEvent(BaseModel):
    message_id: UUID


class TypingEvent(BaseModel):
    pass


class ParticipantAddEvent(BaseModel):
    invited_id: UUID


class KickParticipantEvent(BaseModel):
    kicked_id: UUID


class ChatRenameEvent(BaseModel):
    new_chat_name: str


class MessageSenderSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sender_id: UUID | None
    username: str
    first_name: str
    last_name: str
    avatar_key: str | None


class MessageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender: MessageSenderSchema | UUID | None
    parent_msg: MessageSchema | None
    forwarded_msg: MessageSchema | None
    content: str
    type: MessageTypeEnum
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    edited_at: datetime | None


class MessageCreatedEvent(MessageSchema):
    event_type: Literal["message_created"] = "message_created"


class MessageUpdatedEvent(MessageSchema):
    event_type: Literal["message_updated"] = "message_updated"


class MessageDeletedForAllEvent(BaseModel):
    event_type: Literal["message_deleted_for_all"] = "message_deleted_for_all"
    message_id: UUID


class MessageReadResponseEvent(BaseModel):
    event_type: Literal["message_read"] = "message_read"
    message_id: UUID
    reader_id: UUID


class UserTypingEvent(BaseModel):
    event_type: Literal["user_typing"] = "user_typing"
    user_id: UUID


class ParticipantAddedEvent(BaseModel):
    event_type: Literal["participant_added"] = "participant_added"
    invited_user_id: UUID
    inviter_id: UUID


class ParticipantKickedEvent(BaseModel):
    event_type: Literal["participant_kicked"] = "participant_kicked"
    kicked_user_id: UUID
    initiator_id: UUID


class ChatRenamedEvent(BaseModel):
    event_type: Literal["chat_renamed"] = "chat_renamed"
    new_chat_name: str
    chat_id: UUID
