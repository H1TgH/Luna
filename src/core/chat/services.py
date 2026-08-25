import asyncio
from datetime import datetime
from uuid import UUID, uuid4

from core.chat.entities import (
    ChatCreationDTO,
    ChatDTO,
    ChatInfoDTO,
    ChatPageDTO,
    ChatUploadImageDTO,
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
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.presence.repository import PresenceRepository
from infrastructure.s3.storage import S3Storage
from settings import settings


class ChatService:
    def __init__(
        self,
        uow: UnitOfWork,
        s3_storage: S3Storage,
        image_processor: ImageProcessor
    ) -> None:
        self.uow = uow
        self.s3 = s3_storage
        self.image_processor = image_processor

    async def create_chat(
        self,
        data: ChatCreationDTO,
        creator_id: UUID,
        chat_avatar: ChatUploadImageDTO | None
    ) -> ChatDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)
            profile_repo = ProfileRepository(session)

            all_users = set(data.users_ids) | {creator_id}
            data.users_ids = tuple(all_users)

            if not data.is_group:
                if len(all_users) != 2:
                    raise InvalidParticipantsCountException("Only 2 participants can be in a private chat")
                existing = await repo.get_personal_chat(all_users)
                if existing:
                    return self._build_chat_dto(existing, None, None, None, 0, False)
            object_key = None

            if data.is_group:
                data.creator_id = creator_id
                if chat_avatar is not None:
                    converted = await asyncio.to_thread(self.image_processor.convert_to_webp, chat_avatar.data)
                    object_key = f"{uuid4()}.webp"
                    await self.s3.upload(object_key, converted, "image/webp")

            chat = await repo.create_chat(data, object_key)

            if data.is_group:
                creator = await profile_repo.get_by_user_id(creator_id)
                message_dto = MessageCreationDTO(
                    None,
                    chat.id,
                    f"Пользователь {creator.full_name} создал чат {data.name}",
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

            personal_chats = {}
            for chat in chats:
                if chat.is_group:
                    chat.avatar_url = self._build_chat_avatar_url(chat.avatar_url)
                else:
                    personal_chats[chat.id] = chat

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

            if message_data.type != MessageTypeEnum.SYSTEM:
                await self._check_user_is_participant_or_raise(chat_repo, message_data.chat_id, message_data.sender_id)

            message = await chat_repo.create_message(message_data)
            sender = await profile_repo.get_by_user_id(message_data.sender_id)

            avatar_url = None
            if sender:
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
            chat_repo = ChatRepository(session)
            presence_repo = PresenceRepository()

            await self._check_user_is_participant_or_raise(chat_repo, chat_id, current_user_id)

            chat = await chat_repo.get_chat_by_id(chat_id)
            chat_dto = ChatInfoDTO(
                id=chat.id,
                is_group=chat.is_group
            )
            if chat.is_group:
                chat_dto.name = chat.name
                chat_dto.avatar_url = self._build_chat_avatar_url(chat.avatar_key)
                counts = await self._get_chat_participants_count(chat_repo, presence_repo, chat_id)
                chat_dto.participants_count = counts[0]
                chat_dto.online_participants_count = counts[1]
            else:
                interlocutor = await chat_repo.get_personal_chat_interlocutors([chat_id], current_user_id)
                interlocutor = interlocutor.get(chat_id)
                chat_dto.name = interlocutor.full_name
                chat_dto.avatar_url = self._build_avatar_url(interlocutor.avatar_key)
                chat_dto.username = interlocutor.username
                chat_dto.is_online = await presence_repo.is_online(interlocutor.id)
                chat_dto.last_seen = await presence_repo.get_last_seen(interlocutor.id)

            own_last_read_message_id = await chat_repo.get_last_read_message_id(chat_id, current_user_id)
            peer_last_read_message_id = await chat_repo.get_peer_last_read_message_id(chat_id, current_user_id)

            messages = await chat_repo.get_chat_history(chat_id, limit + 1, cursor)
            has_next = len(messages) > limit
            messages = messages[:limit]
            next_cursor = messages[-1].created_at if messages else None

            return MessageHistoryDTO(
                chat=chat_dto,
                messages=messages,
                last_read_message_id=own_last_read_message_id,
                own_last_read_message_id=own_last_read_message_id,
                peer_last_read_message_id=peer_last_read_message_id,
                has_next=has_next,
                next_cursor=next_cursor
            )

    async def _get_chat_participants_count(
        self,
        chat_repo: ChatRepository,
        presence_repo: PresenceRepository,
        chat_id: UUID
    ) -> tuple[int, int]:
        participants_ids = await chat_repo.get_chat_participants_ids(chat_id)

        participants_count = len(participants_ids)
        online_count = 0

        for pid in participants_ids:
            status = await presence_repo.is_online(pid)
            if status:
                online_count += 1

        return participants_count, online_count

    async def update_chat_name(
        self,
        chat_id: UUID,
        new_name: str
    ) -> None:
        async with self.uow() as session:
            repo = ChatRepository(session)

            chat = await repo.get_chat_by_id(chat_id)
            if chat is None or not chat.is_group:
                raise PermissionDeniedException("Bad request")  # Пофиксить позже

            await repo.update_chat_name(chat_id, new_name)

    async def update_chat_avatar(
        self,
        chat_id: UUID,
        avatar: ChatUploadImageDTO
    ) -> str:
        async with self.uow() as session:
            repo = ChatRepository(session)

            chat = await repo.get_chat_by_id(chat_id)
            if chat is None or not chat.is_group:
                raise PermissionDeniedException("Bad request")  # Пофиксить позже

            converted = await asyncio.to_thread(self.image_processor.convert_to_webp, avatar.data)
            object_key = f"{uuid4()}.webp" if not chat.avatar_key else chat.avatar_key
            await self.s3.upload(object_key, converted, "image/webp")

            if chat.avatar_key is None:
                await repo.update_chat_avatar_key(chat_id, object_key)

            return self._build_chat_avatar_url(object_key)

    async def invite_user_to_chat(
        self,
        chat_id: UUID,
        user_id: UUID,
        inviter_id: UUID
    ) -> None:
        async with self.uow() as session:
            repo = ChatRepository(session)
            profile_repo = ProfileRepository(session)

            chat = await repo.get_chat_by_id(chat_id)
            if chat is None or not chat.is_group:
                raise PermissionDeniedException("Bad request")  # Пофиксить позже

            user = await profile_repo.get_by_user_id(user_id)
            inviter = await profile_repo.get_by_user_id(inviter_id)
            message_dto = MessageCreationDTO(
                None,
                chat_id,
                f"{inviter.full_name} пригласил(а) {user.full_name}",
                MessageTypeEnum.SYSTEM
            )
            await repo.create_message(message_dto)

            await repo.add_user_to_chat(chat_id, user_id)

    async def edit_message(self, message_id: UUID, current_user_id: UUID, data: MessageUpdateDTO) -> MessageDTO:
        async with self.uow() as session:
            repo = ChatRepository(session)
            profile_repo = ProfileRepository(session)

            updated_message = await repo.update_message(message_id, current_user_id, data)
            if updated_message is None:
                raise PermissionDeniedException("You can't edit this message")

            sender = await profile_repo.get_by_user_id(current_user_id)
            avatar_url = self._build_avatar_url(sender.avatar_key)
            return self._build_message_dto(updated_message, sender, avatar_url)

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

    async def kick_user_from_chat(self, chat_id: UUID, user_id: UUID, initiator_id: UUID) -> None:
        async with self.uow() as session:
            chat_repo = ChatRepository(session)
            profile_repo = ProfileRepository(session)

            chat = await chat_repo.get_chat_by_id(chat_id)
            if not chat.is_group:
                raise PermissionDeniedException("You can only kick participants from group chats")
            if chat.creator_id != initiator_id and user_id != initiator_id:
                raise PermissionDeniedException("Only the creator can kick the participants")

            initiator = await profile_repo.get_by_user_id(initiator_id)
            user = await profile_repo.get_by_user_id(user_id)
            if initiator_id == user_id:
                system_message_content = f"{initiator.full_name} покинул(а) чат"
            else:
                system_message_content = f"{initiator.full_name} исключил(а) {user.full_name}"
            message_dto = MessageCreationDTO(
                None,
                chat.id,
                system_message_content,
                MessageTypeEnum.SYSTEM
            )
            message = await chat_repo.create_message(message_dto)
            await chat_repo.update_chat_last_message(chat.id, message.id)

            await chat_repo.delete_user_from_chat(chat_id, user_id)

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
        sender: ProfileModel | None,
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
            ) if sender else None,
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
    def _build_chat_avatar_url(avatar_key: str | None) -> str:
        if avatar_key is None:
            return None
        return f"{settings.s3.public_endpoint}/media/chat-avatars/{avatar_key}"

    @staticmethod
    async def _check_user_is_participant_or_raise(repo: ChatRepository, chat_id: UUID, current_user_id: UUID):
        is_participant = await repo.check_user_is_participant(chat_id, current_user_id)
        if not is_participant:
            raise PermissionDeniedException("You are not a participant of this chat")


def get_chat_service() -> ChatService:
    return ChatService(
        uow=UnitOfWork(),
        s3_storage=S3Storage(
            access_key=settings.s3.access_key,
            secret_key=settings.s3.secret_key.get_secret_value(),
            bucket_name="chat-avatars",
            internal_endpoint_url=settings.s3.internal_endpoint,
            public_endpoint_url=settings.s3.public_endpoint
        ),
        image_processor=ImageProcessor()
    )
