from uuid import UUID

from api.chat.websocket.events import (
    ChatRenamedEvent,
    ChatRenameEvent,
    DeleteForAllEvent,
    DeleteForMeEvent,
    EditMessageEvent,
    KickParticipantEvent,
    MessageCreatedEvent,
    MessageDeletedForAllEvent,
    MessageReadEvent,
    MessageReadResponseEvent,
    MessageUpdatedEvent,
    NewMessageEvent,
    ParticipantAddedEvent,
    ParticipantAddEvent,
    ParticipantKickedEvent,
    TypingEvent,
    UserTypingEvent,
)
from core.chat.entities import MessageCreationDTO, MessageUpdateDTO
from core.chat.enums import MessageTypeEnum
from core.chat.services import ChatService
from infrastructure.websocket.manager import ConnectionManager


class WebSocketEventHandler:
    def __init__(
        self,
        chat_service: ChatService,
        connection_manager: ConnectionManager,
    ) -> None:
        self.chat_service = chat_service
        self.connection_manager = connection_manager

        self.events = {
            "new_message": {
                "schema": NewMessageEvent,
                "handler": self.handle_new_message,
            },
            "edit_message": {
                "schema": EditMessageEvent,
                "handler": self.handle_edit_message,
            },
            "delete_for_me": {
                "schema": DeleteForMeEvent,
                "handler": self.handle_delete_for_me,
            },
            "delete_for_all": {
                "schema": DeleteForAllEvent,
                "handler": self.handle_delete_for_all,
            },
            "message_read": {
                "schema": MessageReadEvent,
                "handler": self.handle_message_read,
            },
            "typing": {
                "schema": TypingEvent,
                "handler": self.handle_typing,
            },
            "participant_add": {
                "schema": ParticipantAddEvent,
                "handler": self.handle_participant_add,
            },
            "participant_kick": {
                "schema": KickParticipantEvent,
                "handler": self.handle_participant_kick,
            },
            "chat_rename": {
                "schema": ChatRenameEvent,
                "handler": self.handle_chat_rename,
            },
        }

    async def dispatch(
        self,
        chat_id: UUID,
        user_id: UUID,
        event_type: str,
        data: dict,
    ) -> None:
        event = self.events[event_type]

        event_data = event["schema"].model_validate(data)

        await event["handler"](
            chat_id,
            user_id,
            event_data,
        )

    async def handle_new_message(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: NewMessageEvent,
    ) -> None:
        message = await self.chat_service.send_message(
            MessageCreationDTO(
                sender_id=user_id,
                chat_id=chat_id,
                content=data.content,
                type=MessageTypeEnum.USER,
            )
        )

        response = MessageCreatedEvent.model_validate(message)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

    async def handle_edit_message(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: EditMessageEvent,
    ) -> None:
        edited_message = await self.chat_service.edit_message(
            message_id=data.message_id,
            current_user_id=user_id,
            data=MessageUpdateDTO(data.content),
        )

        response = MessageUpdatedEvent.model_validate(edited_message)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

    async def handle_delete_for_me(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: DeleteForMeEvent,
    ) -> None:
        await self.chat_service.delete_message_for_me(data.message_id)

    async def handle_delete_for_all(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: DeleteForAllEvent,
    ) -> None:
        await self.chat_service.delete_message_for_all(data.message_id)

        response = MessageDeletedForAllEvent(
            message_id=data.message_id,
        )

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

    async def handle_message_read(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: MessageReadEvent,
    ) -> None:
        await self.chat_service.mark_as_read(
            chat_id,
            user_id,
            data.message_id,
        )

        response = MessageReadResponseEvent(
            message_id=data.message_id,
            reader_id=user_id,
        )

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

    async def handle_typing(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: TypingEvent,
    ) -> None:
        response = UserTypingEvent(user_id=user_id)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

    async def handle_participant_add(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: ParticipantAddEvent,
    ) -> None:
        await self.chat_service.invite_user_to_chat(
            chat_id,
            data.invited_id,
            user_id,
        )

        response = ParticipantAddedEvent(
            invited_user_id=data.invited_id,
            inviter_id=user_id,
        )

        message_dto = MessageCreationDTO(
            None,
            chat_id,
            f"{user_id} пригласил(а) {data.invited_id}",
            MessageTypeEnum.SYSTEM
        )
        message = await self.chat_service.send_message(message_dto)
        message_response = MessageCreatedEvent.model_validate(message)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

        await self.connection_manager.broadcast(
            chat_id,
            message_response.model_dump(mode="json")
        )


    async def handle_participant_kick(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: KickParticipantEvent,
    ) -> None:
        await self.chat_service.kick_user_from_chat(
            chat_id,
            data.kicked_id,
            user_id,
        )

        response = ParticipantKickedEvent(
            kicked_user_id=data.kicked_id,
            initiator_id=user_id,
        )


        if user_id == data.kicked_id:
            system_message_content = f"{user_id} покинул(а) чат"
        else:
            system_message_content = f"{user_id} исключил(а) {data.kicked_id}"
        message_dto = MessageCreationDTO(
            None,
            chat_id,
            system_message_content,
            MessageTypeEnum.SYSTEM
        )
        message = await self.chat_service.send_message(message_dto)
        message_response = MessageCreatedEvent.model_validate(message)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

        await self.connection_manager.broadcast(
            chat_id,
            message_response.model_dump(mode="json")
        )

    async def handle_chat_rename(
        self,
        chat_id: UUID,
        user_id: UUID,
        data: ChatRenameEvent,
    ) -> None:
        await self.chat_service.update_chat_name(
            chat_id,
            data.new_chat_name,
        )

        response = ChatRenamedEvent(
            new_chat_name=data.new_chat_name,
            chat_id=chat_id
        )

        message_dto = MessageCreationDTO(
            None,
            chat_id,
            f"{user_id} изменил название чата на {data.new_chat_name}",
            MessageTypeEnum.SYSTEM
        )
        message = await self.chat_service.send_message(message_dto)
        message_response = MessageCreatedEvent.model_validate(message)

        await self.connection_manager.broadcast(
            chat_id,
            response.model_dump(mode="json"),
        )

        await self.connection_manager.broadcast(
            chat_id,
            message_response.model_dump(mode="json")
        )
