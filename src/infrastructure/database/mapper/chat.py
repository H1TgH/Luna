from uuid import UUID

from core.chat.entities import ChatDTO, MessageCreationDTO, MessageDTO, MessageSenderDTO
from core.chat.enums import MessageTypeEnum
from infrastructure.database.models.chat import ChatModel, MessageModel
from infrastructure.database.models.profile import ProfileModel
from settings import settings


class ChatMapper:
    def build_chat_dto(
        self,
        chat: ChatModel,
        message: MessageModel | None,
        sender: ProfileModel | None,
        unread_count: int,
        has_unread: bool
    ) -> ChatDTO:
        return ChatDTO(
            id=chat.id,
            is_group=chat.is_group,
            name=chat.name,
            avatar_url=chat.avatar_key,
            last_message=self.build_message_dto(message, sender) if message else None,
            unread_count=unread_count,
            is_mark_unread=has_unread,
            created_at=chat.created_at,
        )

    def build_message_dto(
        self,
        message: MessageModel,
        sender: ProfileModel | UUID | None
    ) -> MessageDTO:
        if isinstance(sender, ProfileModel):
            sender = self._build_message_sender_dto(sender)

        return MessageDTO(
            id=message.id,
            sender=sender,
            content=message.content,
            type=message.type,
            is_edited=message.is_edited,
            is_deleted=message.is_deleted,
            created_at=message.created_at,
            edited_at=message.edited_at
        )

    def build_message_creation_dto(
        self,
        sender_id: UUID | None,
        chat_id: UUID,
        content: str,
        message_type: MessageTypeEnum
    ) -> MessageCreationDTO:
        return MessageCreationDTO(
            sender_id,
            chat_id,
            content,
            message_type
        )

    @staticmethod
    def _build_message_sender_dto(
        sender: ProfileModel
    ) -> MessageSenderDTO:
        return MessageSenderDTO(
            sender_id=sender.id,
            username=sender.username,
            first_name=sender.first_name,
            last_name=sender.last_name,
            avatar_key=f"{settings.s3.public_endpoint}/media/avatars/{sender.avatar_key}"
        )
