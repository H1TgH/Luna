from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from core.chat.entities import (
    ChatCreationDTO,
    ChatDTO,
    MessageCreationDTO,
    MessageDTO,
    MessageSenderDTO,
    MessageUpdateDTO,
)
from infrastructure.database.models.chat import ChatModel, ChatParticipantModel, MessageModel
from infrastructure.database.models.profile import ProfileModel
from settings import settings


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_chat(self, data: ChatCreationDTO) -> ChatModel:
        chat = ChatModel(
            is_group=data.is_group,
            name=data.name,
            creator_id=data.creator_id
        )
        self.session.add(chat)
        await self.session.flush()

        for user_id in data.users_ids:
            self.session.add(
                ChatParticipantModel(
                    chat_id=chat.id,
                    user_id=user_id
                )
            )

        return chat

    async def get_personal_chat(self, user_ids: set[UUID]) -> ChatModel | None:
        user_ids_list = list(user_ids)
        stmt = (
            select(ChatModel)
            .join(ChatParticipantModel)
            .where(
                ChatModel.is_group == False,
                ChatParticipantModel.user_id.in_(user_ids_list)
            )
            .group_by(ChatModel.id)
            .having(func.count(ChatParticipantModel.user_id) == 2)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_chat_by_id(self, chat_id: UUID) -> ChatModel | None:
        stmt = select(ChatModel).where(ChatModel.id == chat_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_chats(
        self,
        user_id: UUID,
        limit: int = 20,
        cursor: datetime | None = None
    ) -> list[ChatDTO]:

        current_participant = aliased(ChatParticipantModel)
        other_participant = aliased(ChatParticipantModel)

        last_read_created_at = (
            select(MessageModel.created_at)
            .where(
                MessageModel.id == current_participant.last_read_message_id
            )
            .correlate(current_participant)
            .scalar_subquery()
        )

        unread_count = (
            select(func.count(MessageModel.id))
            .where(
                MessageModel.chat_id == ChatModel.id,
                or_(
                    current_participant.last_read_message_id.is_(None),
                    MessageModel.created_at > last_read_created_at
                )
            )
            .correlate(ChatModel, current_participant)
            .scalar_subquery()
        )

        has_unread = exists(
            select(ChatParticipantModel)
            .where(
                ChatParticipantModel.chat_id == ChatModel.id,
                ChatParticipantModel.user_id != user_id,
                ChatParticipantModel.last_read_message_id != ChatModel.last_message_id
            )
        )

        stmt = (
            select(
                ChatModel,
                MessageModel,
                ProfileModel,
                unread_count.label("unread_count"),
                has_unread.label("has_unread")
            )
            .join(
                current_participant,
                ChatModel.id == current_participant.chat_id
            )
            .outerjoin(
                MessageModel,
                ChatModel.last_message_id == MessageModel.id
            )
            .outerjoin(
                ProfileModel,
                MessageModel.sender_id == ProfileModel.id
            )
            .where(
                current_participant.user_id == user_id,
                or_(
                    ChatModel.is_group,
                    MessageModel.id.is_not(None)
                )
            )
            .order_by(MessageModel.created_at.desc())
            .limit(limit)
        )

        if cursor is not None:
            stmt = stmt.where(MessageModel.created_at < cursor)

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            self._build_chat_dto(
                chat,
                message,
                sender,
                unread_count,
                has_unread
            )
            for chat, message, sender, unread_count, has_unread in rows
        ]

    async def create_message(self, message_data: MessageCreationDTO) -> MessageModel:
        message = MessageModel(
            sender_id=message_data.sender_id,
            chat_id=message_data.chat_id,
            content=message_data.content,
            type=message_data.type
        )
        self.session.add(message)
        await self.session.flush()

        return message

    async def update_chat_last_message(self, chat_id: UUID, message_id: UUID) -> None:
        stmt = (
            update(ChatModel)
            .where(ChatModel.id == chat_id)
            .values(last_message_id=message_id)
        )
        await self.session.execute(stmt)

    async def get_chat_history(
        self,
        chat_id: UUID,
        limit: int = 50,
        cursor: datetime | None = None
    ) -> list[MessageDTO]:
        stmt = (
            select(MessageModel, ProfileModel)
            .join(ProfileModel, MessageModel.sender_id == ProfileModel.id)
            .where(MessageModel.chat_id == chat_id)
            .order_by(MessageModel.created_at.desc())
            .limit(limit)
        )

        if cursor is not None:
            stmt = stmt.where(MessageModel.created_at < cursor)

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            self._build_message_dto(message, sender)
            for message, sender in rows
        ]

    async def check_user_is_participant(
        self,
        chat_id: UUID,
        user_id: UUID
    ) -> bool:
        stmt = select(
            exists().where(
                ChatParticipantModel.chat_id == chat_id,
                ChatParticipantModel.user_id == user_id
            )
        )

        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_personal_chat_interlocutors(self, chat_ids: list[UUID], user_id: UUID) -> dict[UUID, ProfileModel]:
        stmt = (
            select(ChatParticipantModel, ProfileModel)
            .join(ProfileModel, ChatParticipantModel.user_id == ProfileModel.id)
            .where(
                ChatParticipantModel.chat_id.in_(chat_ids),
                ChatParticipantModel.user_id != user_id
            )
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        interlocutors = {cp.chat_id: profile for cp, profile in rows}
        return interlocutors

    async def update_message(
        self,
        message_id: UUID,
        user_id: UUID,
        data: MessageUpdateDTO
    ) -> MessageModel | None:
        stmt = (
            update(MessageModel)
            .where(MessageModel.id == message_id, MessageModel.sender_id == user_id)
            .values(
                content=data.content,
                is_edited=True,
                edited_at=func.now()
            )
            .returning(MessageModel)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mark_as_read(
        self,
        chat_id: UUID,
        user_id: UUID,
        message_id: UUID
    ) -> None:
        stmt = (
            update(ChatParticipantModel)
            .where(
                ChatParticipantModel.chat_id == chat_id,
                ChatParticipantModel.user_id == user_id
            )
            .values(last_read_message_id=message_id)
        )
        await self.session.execute(stmt)

    async def delete_message_for_me(self, message_id: UUID) -> None:
        stmt = (
            update(MessageModel)
            .where(MessageModel.id == message_id)
            .values(is_deleted=True)
        )
        await self.session.execute(stmt)

    async def delete_message_for_all(self, message_id: UUID) -> None:
        stmt = (
            delete(MessageModel)
            .where(MessageModel.id == message_id)
        )
        await self.session.execute(stmt)

    async def get_last_read_message_id(self, chat_id: UUID, user_id: UUID) -> UUID | None:
        stmt = (
            select(ChatParticipantModel.last_read_message_id)
            .where(
                ChatParticipantModel.chat_id == chat_id,
                ChatParticipantModel.user_id == user_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def _build_chat_dto(
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
            last_message=MessageDTO(
                id=message.id,
                content=message.content,
                type=message.type,
                sender=MessageSenderDTO(
                    sender_id=sender.id,
                    username=sender.username,
                    first_name=sender.first_name,
                    last_name=sender.last_name,
                    avatar_key=sender.avatar_key
                ) if sender else None,
                created_at=message.created_at,
                is_deleted=message.is_deleted,
                is_edited=message.is_edited,
                edited_at=message.edited_at
            ) if message else None,
            unread_count=unread_count,
            is_mark_unread=has_unread,
            created_at=chat.created_at,
        )

    @staticmethod
    def _build_message_dto(
        message: MessageModel,
        sender: ProfileModel | None
    ):
        return MessageDTO(
            id=message.id,
            sender=MessageSenderDTO(
                sender_id=sender.id,
                username=sender.username,
                first_name=sender.first_name,
                last_name=sender.last_name,
                avatar_key=f"{settings.s3.public_endpoint}/media/avatars/{sender.avatar_key}"
            ),
            content=message.content,
            type=message.type,
            is_edited=message.is_edited,
            is_deleted=message.is_deleted,
            created_at=message.created_at,
            edited_at=message.edited_at
        )
