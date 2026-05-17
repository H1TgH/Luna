from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status

from core.auth.services import AuthService, get_auth_service
from core.presense.services import PresenseService, get_presense_service


presense_router = APIRouter(
    prefix="/presense",
    tags=["Presense"]
)


@presense_router.websocket("/ws")
async def get_presense_status(
    websocket: WebSocket,
    token: str = Query(),
    auth_service: AuthService = Depends(get_auth_service),
    presense_service: PresenseService = Depends(get_presense_service)
):
    await websocket.accept()
    payload = auth_service.verify_token(token, "access")
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return
    user_id = payload.get("sub")

    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await presense_service.set_online(user_id)
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await presense_service.set_offline(user_id)
