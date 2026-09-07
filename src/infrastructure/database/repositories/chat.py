from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from core.chat.entities import (
    ChatCreationDTO,
    ChatDTO,
    MessageCreationDTO,
    MessageUpdateDTO,
)
from infrastructure.database.mapper.chat import ChatMapper
from infrastructure.database.models.chat import ChatModel, ChatParticipantModel, MessageModel
from infrastructure.database.models.profile import ProfileModel


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_chat(self, data: ChatCreationDTO, chat_avatar_key: str | None) -> ChatModel:
        chat = ChatModel(
            is_group=data.is_group,
            name=data.name,
            creator_id=data.creator_id,
            avatar_key=chat_avatar_key
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
            ChatMapper().build_chat_dto(
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
    ) -> list[tuple[MessageModel, ProfileModel]]:
        stmt = (
            select(MessageModel, ProfileModel)
            .outerjoin(ProfileModel, MessageModel.sender_id == ProfileModel.id)
            .where(MessageModel.chat_id == chat_id)
            .order_by(MessageModel.created_at.desc())
            .limit(limit)
        )

        if cursor is not None:
            stmt = stmt.where(MessageModel.created_at < cursor)

        result = await self.session.execute(stmt)
        rows = result.all()

        return rows

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

    async def delete_message_for_me(self, message_id: UUID) -> None:  # Исправить, добавив id пользователя
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

    async def get_peer_last_read_message_id(self, chat_id: UUID, current_user_id: UUID) -> UUID | None:
        stmt = (
            select(ChatParticipantModel.last_read_message_id)
            .join(
                MessageModel,
                MessageModel.id == ChatParticipantModel.last_read_message_id
            )
            .where(
                ChatParticipantModel.chat_id == chat_id,
                ChatParticipantModel.user_id != current_user_id,
                ChatParticipantModel.last_read_message_id.is_not(None)
            )
            .order_by(MessageModel.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_user_from_chat(self, chat_id: UUID, user_id: UUID) -> None:
        stmt = (
            delete(ChatParticipantModel)
            .where(
                ChatParticipantModel.chat_id == chat_id,
                ChatParticipantModel.user_id == user_id
            )
        )
        await self.session.execute(stmt)

    async def get_chat_participants_ids(
        self,
        chat_id: UUID
    ) -> list[UUID]:
        stmt = (
            select(ChatParticipantModel.user_id)
            .where(ChatParticipantModel.chat_id == chat_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_chat_name(
        self,
        chat_id: UUID,
        new_name: str
    ) -> None:
        stmt = (
            update(ChatModel)
            .where(ChatModel.id == chat_id)
            .values(name=new_name)
        )
        await self.session.execute(stmt)

    async def update_chat_avatar_key(
        self,
        chat_id: UUID,
        avatar_key: str
    ) -> None:
        stmt = (
            update(ChatModel)
            .where(ChatModel.id == chat_id)
            .values(avatar_key=avatar_key)
        )
        await self.session.execute(stmt)

    async def add_user_to_chat(
        self,
        chat_id: UUID,
        user_id: UUID
    ) -> None:
        participant = ChatParticipantModel(
            chat_id=chat_id,
            user_id=user_id
        )
        self.session.add(participant)
