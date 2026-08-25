from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from core.auth.entities import CurrentUserDTO
from core.presence.services import PresenceService, get_presence_service
from dependencies import get_ws_current_user


presence_router = APIRouter(
    prefix="/presence",
    tags=["Presence"]
)


@presence_router.websocket("/ws")
async def get_presence_status(
    websocket: WebSocket,
    current_user: CurrentUserDTO = Depends(get_ws_current_user),
    presence_service: PresenceService = Depends(get_presence_service)
):
    await websocket.accept()

    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await presence_service.set_online(current_user.id)
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await presence_service.set_offline(current_user.id)
