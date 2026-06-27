from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.chat.schemas import (
    ChatCreationSchema,
    ChatPageSchema,
    ChatSchema,
    MessageCreationSchema,
    MessageHistorySchema,
    MessageSchema,
    MessageUpdateSchema,
)
from core.auth.entities import CurrentUserDTO
from core.chat.entities import ChatCreationDTO, MessageCreationDTO
from core.chat.enums import MessageTypeEnum
from core.chat.services import ChatService, get_chat_service
from dependencies import get_current_user


chat_router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)


@chat_router.post(
    "/",
    status_code=201,
    response_model=ChatSchema
)
async def create_chat(
    data: ChatCreationSchema,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    dto = ChatCreationDTO(**data.model_dump())
    return await service.create_chat(dto, current_user.id)


@chat_router.get(
    "/",
    status_code=200,
    response_model=ChatPageSchema
)
async def get_user_chats(
    limit: int = Query(20, ge=1, le=50),
    cursor: datetime | None = Query(None),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return await service.get_user_chats(current_user.id, current_user.id, limit, cursor)


@chat_router.post(
    "/message",
    status_code=201,
    response_model=MessageSchema
)
async def send_message(
    message_data: MessageCreationSchema,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    dto = MessageCreationDTO(
        **message_data.model_dump(),
        sender_id=current_user.id,
        type=MessageTypeEnum.USER
    )

    return await service.send_message(dto)


@chat_router.patch(
    "/message/{message_id}",
    status_code=204
)
async def edit_message(
    message_id: UUID,
    data: MessageUpdateSchema,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    await service.edit_message(message_id, current_user.id, data)


@chat_router.delete(
    "/message/{message_id}/me",
    status_code=204
)
async def delete_message_for_me(
    message_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    await service.delete_message_for_me(message_id)


@chat_router.delete(
    "/message/{message_id}/all",
    status_code=204
)
async def delete_message_for_all(
    message_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    await service.delete_message_for_all(message_id)


@chat_router.get(
    "/{chat_id}",
    status_code=200,
    response_model=MessageHistorySchema
)
async def get_chat_history(
    chat_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    cursor: datetime | None = Query(None),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    return await service.get_chat_history(chat_id, current_user.id, limit, cursor)


@chat_router.patch(
    "/{chat_id}/{message_id}/read",
    status_code=204
)
async def mark_as_read(
    chat_id: UUID,
    message_id: UUID,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    await service.mark_as_read(chat_id, current_user.id, message_id)
