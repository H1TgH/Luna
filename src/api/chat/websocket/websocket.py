from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)

from api.chat.websocket.handler import WebSocketEventHandler
from core.auth.entities import CurrentUserDTO
from core.chat.services import ChatService, get_chat_service
from dependencies import get_ws_current_user
from infrastructure.websocket.manager import (
    ConnectionManager,
    get_connection_manager,
)


chat_ws_router = APIRouter(
    prefix="/chats/ws",
)


@chat_ws_router.websocket(
    "/{chat_id}",
)
async def chat_ws(
    websocket: WebSocket,
    chat_id: UUID,
    current_user: CurrentUserDTO = Depends(get_ws_current_user),
    chat_service: ChatService = Depends(get_chat_service),
    connection_manager: ConnectionManager = Depends(get_connection_manager),
):
    await websocket.accept()
    connection_manager.connect(
        websocket,
        chat_id,
        current_user.id,
    )

    handler = WebSocketEventHandler(
        chat_service,
        connection_manager,
    )

    try:
        while True:
            data = await websocket.receive_json()

            try:
                await handler.dispatch(
                    chat_id=chat_id,
                    user_id=current_user.id,
                    event_type=data["event_type"],
                    data=data,
                )

            except Exception:
                raise

    except WebSocketDisconnect:
        pass
    finally:
        connection_manager.disconnect(
            websocket,
            chat_id,
            current_user.id,
        )
