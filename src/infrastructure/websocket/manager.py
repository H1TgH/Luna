from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[UUID, dict[UUID, set[WebSocket]]] = {}

    def connect(
        self,
        websocket: WebSocket,
        chat_id: UUID,
        user_id: UUID
    ) -> None:
        if chat_id not in self.connections:
            self.connections[chat_id] = {}

        if user_id not in self.connections[chat_id]:
            self.connections[chat_id][user_id] = set()

        self.connections[chat_id][user_id].add(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
        chat_id: UUID,
        user_id: UUID
    ) -> None:
        self.connections[chat_id][user_id].discard(websocket)

        if not self.connections[chat_id][user_id]:
            self.connections[chat_id].pop(user_id)

        if not self.connections[chat_id]:
            self.connections.pop(chat_id)

    async def broadcast(
        self,
        chat_id: UUID,
        data: dict
    ):
        if chat_id in self.connections:
            for participant_id in self.connections[chat_id]:
                for connection in self.connections[chat_id][participant_id]:
                    await connection.send_json(data)


connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    return connection_manager
