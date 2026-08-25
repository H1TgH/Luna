from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from core.auth.entities import CurrentUserDTO
from core.presense.services import PresenseService, get_presense_service
from dependencies import get_ws_current_user


presense_router = APIRouter(
    prefix="/presense",
    tags=["Presense"]
)


@presense_router.websocket("/ws")
async def get_presense_status(
    websocket: WebSocket,
    current_user: CurrentUserDTO = Depends(get_ws_current_user),
    presense_service: PresenseService = Depends(get_presense_service)
):
    await websocket.accept()

    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await presense_service.set_online(current_user.id)
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await presense_service.set_offline(current_user.id)
