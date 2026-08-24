from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from api.chat.websocket.handler import WebSocketEventHandler
from core.auth.exceptions import InvalidTokenException
from core.auth.services import AuthService, get_auth_service
from core.chat.services import ChatService, get_chat_service
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
    chat_service: ChatService = Depends(get_chat_service),
    auth_service: AuthService = Depends(get_auth_service),
    connection_manager: ConnectionManager = Depends(get_connection_manager),
):
    try:
        token = websocket.cookies.get("user_access_token", None)
        payload = auth_service.verify_token(token, "access")

    except InvalidTokenException:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid token",
        )
        return

    user_id = UUID(payload.get("sub"))

    await websocket.accept()
    connection_manager.connect(
        websocket,
        chat_id,
        user_id,
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
                    user_id=user_id,
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
            user_id,
        )
