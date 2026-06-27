from datetime import datetime
from uuid import UUID

from core.chat.entities import (
    ChatCreationDTO,
    ChatDTO,
    ChatInfoDTO,
    ChatPageDTO,
    MessageCreationDTO,
    MessageDTO,
    MessageHistoryDTO,
    MessageSenderDTO,
    MessageUpdateDTO,
)
from core.chat.enums import MessageTypeEnum
from core.chat.exceptions import InvalidParticipantsCountException
from core.exceptions import PermissionDeniedException
from infrastructure.database.models.chat import ChatModel, MessageModel
from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.repositories.chat import ChatRepository
from infrastructure.database.repositories.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings


class ChatService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    async def create_chat(self, data: ChatCreationDTO, creator_id: UUID) -> ChatDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)

            all_users = set(data.users_ids) | {creator_id}
            data.users_ids = tuple(all_users)

            if not data.is_group:
                if len(all_users) != 2:
                    raise InvalidParticipantsCountException("Only 2 participants can be in a private chat")
                existing = await repo.get_personal_chat(all_users)
                if existing:
                    return self._build_chat_dto(existing, None, None, None, 0, False)

            if data.is_group:
                data.creator_id = creator_id

            chat = await repo.create_chat(data)

            if data.is_group:
                message_dto = MessageCreationDTO(
                    None,
                    chat.id,
                    f"Пользователь {creator_id} создал беседу с названием {data.name}",
                    MessageTypeEnum.SYSTEM
                )
                message = await repo.create_message(message_dto)
                await repo.update_chat_last_message(chat.id, message.id)

            return self._build_chat_dto(chat, None, None, None, 0, False)

    async def get_user_chats(
        self,
        user_id: UUID,
        current_user_id: UUID,
        limit: int = 20,
        cursor: datetime | None = None
    ) -> ChatPageDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)

            chats = await repo.get_user_chats(user_id, limit + 1, cursor)
            has_next = len(chats) > limit
            chats = chats[:limit]
            next_cursor = chats[-1].last_message.created_at if chats else None

            personal_chats = {
                chat.id: chat
                for chat in chats
                if not chat.is_group
            }
            interlocutors = await repo.get_personal_chat_interlocutors(personal_chats.keys(), current_user_id)
            for chat_id in personal_chats:
                personal_chats[chat_id].name = interlocutors[chat_id].full_name
                personal_chats[chat_id].avatar_url = self._build_avatar_url(interlocutors[chat_id].avatar_key)

            return ChatPageDTO(
                chats,
                has_next,
                next_cursor
            )

    async def send_message(self, message_data: MessageCreationDTO) -> MessageDTO:
        async with self.uow() as session:
            chat_repo = ChatRepository(session)
            profile_repo = ProfileRepository(session)

            await self._check_user_is_participant_or_raise(chat_repo, message_data.chat_id, message_data.sender_id)

            message = await chat_repo.create_message(message_data)
            sender = await profile_repo.get_by_user_id(message_data.sender_id)
            avatar_url = self._build_avatar_url(sender.avatar_key)

            await chat_repo.update_chat_last_message(message.chat_id, message.id)
            await chat_repo.mark_as_read(message_data.chat_id, message_data.sender_id, message.id)

            return self._build_message_dto(message, sender, avatar_url)

    async def get_chat_history(
        self,
        chat_id: UUID,
        current_user_id: UUID,
        limit: int = 50,
        cursor: datetime | None = None
    ) -> MessageHistoryDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)

            await self._check_user_is_participant_or_raise(repo, chat_id, current_user_id)

            chat = await repo.get_chat_by_id(chat_id)
            chat_dto = ChatInfoDTO(
                id=chat.id,
                is_group=chat.is_group
            )
            if chat.is_group:
                chat_dto.name = chat.name
                chat_dto.avatar_url = chat.avatar_key
            else:
                interlocutor = await repo.get_personal_chat_interlocutors([chat_id], current_user_id)
                interlocutor = interlocutor.get(chat_id)
                chat_dto.name = interlocutor.full_name
                chat_dto.avatar_url = self._build_avatar_url(interlocutor.avatar_key)
                chat_dto.username = interlocutor.username

            last_read_message_id = await repo.get_last_read_message_id(chat_id, current_user_id)

            messages = await repo.get_chat_history(chat_id, limit + 1, cursor)
            has_next = len(messages) > limit
            messages = messages[:limit]
            next_cursor = messages[-1].created_at if messages else None

            return MessageHistoryDTO(
                chat=chat_dto,
                messages=messages,
                last_read_message_id=last_read_message_id,
                has_next=has_next,
                next_cursor=next_cursor
            )

    async def edit_message(self, message_id: UUID, current_user_id: UUID, data: MessageUpdateDTO) -> MessageDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)

            updated_message = await repo.update_message(message_id, current_user_id, data)
            if updated_message is None:
                raise PermissionDeniedException("You can't edit this message")

            return updated_message

    async def mark_as_read(
        self,
        chat_id: UUID,
        user_id: UUID,
        message_id: UUID
    ) -> None:
        async with self.uow() as session:
            repo = ChatRepository(session)

            await repo.mark_as_read(chat_id, user_id, message_id)

    async def delete_message_for_me(self, message_id: UUID) -> None:
        async with self.uow() as session:
            repo = ChatRepository(session)

            await repo.delete_message_for_me(message_id)

    async def delete_message_for_all(self, message_id: UUID) -> None:
        async with self.uow() as session:
            repo = ChatRepository(session)

            await repo.delete_message_for_all(message_id)

    def _build_chat_dto(
        self,
        chat: ChatModel,
        message: MessageModel | None,
        sender: ProfileModel | None,
        sender_avatar: str | None,
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
                sender=MessageSenderDTO(
                    sender_id=sender.id,
                    username=sender.username,
                    first_name=sender.first_name,
                    last_name=sender.last_name,
                    avatar_key=sender_avatar
                ),
                created_at=message.created_at,
                is_deleted=message.is_deleted,
            ) if message else None,
            unread_count=unread_count,
            is_mark_unread=has_unread,
            created_at=chat.created_at,
        )

    @staticmethod
    def _build_message_dto(
        message: MessageModel,
        sender: ProfileModel,
        avatar_url: str | None
    ):
        return MessageDTO(
            id=message.id,
            sender=MessageSenderDTO(
                sender_id=sender.id,
                username=sender.username,
                first_name=sender.first_name,
                last_name=sender.last_name,
                avatar_key=avatar_url
            ),
            content=message.content,
            type=message.type,
            is_edited=message.is_edited,
            is_deleted=message.is_deleted,
            created_at=message.created_at,
            edited_at=message.edited_at
        )

    @staticmethod
    def _build_avatar_url(avatar_key: str | None) -> str:
        if avatar_key is None:
            return None
        return f"{settings.s3.public_endpoint}/media/avatars/{avatar_key}"

    @staticmethod
    async def _check_user_is_participant_or_raise(repo: ChatRepository, chat_id: UUID, current_user_id: UUID):
        is_participant = await repo.check_user_is_participant(chat_id, current_user_id)
        if not is_participant:
            raise PermissionDeniedException("You are not a participant of this chat")


def get_chat_service() -> ChatService:
    return ChatService(UnitOfWork())
