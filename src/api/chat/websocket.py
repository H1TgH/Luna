from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status

from api.chat.schemas import MessageSchema
from core.auth.exceptions import InvalidTokenException
from core.auth.services import AuthService, get_auth_service
from core.chat.entities import MessageCreationDTO, MessageUpdateDTO
from core.chat.enums import MessageTypeEnum
from core.chat.services import ChatService, get_chat_service
from infrastructure.websocket.manager import ConnectionManager, get_connection_manager


chat_ws_router = APIRouter(
    prefix="/chats/ws"
)


@chat_ws_router.websocket(
    "/{chat_id}"
)
async def chat_ws(
    websocket: WebSocket,
    chat_id: UUID,
    token: str = Query(),
    chat_service: ChatService = Depends(get_chat_service),
    auth_service: AuthService = Depends(get_auth_service),
    connection_manager: ConnectionManager = Depends(get_connection_manager)
):
    try:
        payload = auth_service.verify_token(token, "access")
    except InvalidTokenException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    user_id = UUID(payload.get("sub"))

    await websocket.accept()
    connection_manager.connect(websocket, chat_id, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("event_type")

            try:
                if event_type == "new_message":
                    message = await chat_service.send_message(
                        MessageCreationDTO(
                            sender_id=user_id,
                            chat_id=chat_id,
                            content=data.get("content"),
                            type=MessageTypeEnum.USER
                        )
                    )
                    response = MessageSchema.model_validate(message).model_dump(mode="json")
                    response.update({"event_type": "message_created"})
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "edit_message":
                    edited_message = await chat_service.edit_message(
                        message_id=data.get("message_id"),
                        current_user_id=user_id,
                        data=MessageUpdateDTO(data.get("content"))
                    )
                    response = MessageSchema.model_validate(edited_message).model_dump(mode="json")
                    response.update({"event_type": "message_updated"})
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "delete_for_me":
                    await chat_service.delete_message_for_me(data.get("message_id"))

                if event_type == "delete_for_all":
                    await chat_service.delete_message_for_all(data.get("message_id"))
                    response = {"event_type": "message_deleted_for_all", "message_id": data.get("message_id")}
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "message_read":
                    await chat_service.mark_as_read(chat_id, user_id, data.get("message_id"))
                    response = {
                        "event_type": "message_read",
                        "message_id": data.get("message_id"),
                        "reader_id": str(user_id)
                    }
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "typing":
                    response = {"event_type": "user_typing", "user_id": str(user_id)}
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "participant_add":
                    await chat_service.invite_user_to_chat(chat_id, data.get("invited_user_id"), user_id)
                    response = {
                        "event_type": "participant_added",
                        "invited_user_id": data.get("invited_user_id"),
                        "inviter_id": str(user_id)
                    }
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "participant_kick":
                    await chat_service.kick_user_from_chat(chat_id, data.get("kicked_user_id"), user_id)
                    response = {
                        "event_type": "participant_kicked",
                        "kicked_user_id": data.get("kicked_user_id"),
                        "initiator_id": str(user_id)
                    }
                    await connection_manager.broadcast(chat_id, response)

                if event_type == "chat_rename":
                    await chat_service.update_chat_name(chat_id, data.get("new_chat_name"))
                    response = {"event_type": "chat_renamed", "new_chat_name": data.get("new_chat_name")}
                    await connection_manager.broadcast(chat_id, response)

            except Exception:
                # todo слать error event клиенту
                continue

    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(websocket, chat_id, user_id)
