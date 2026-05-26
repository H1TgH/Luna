from datetime import UTC, datetime
from uuid import UUID

import redis.asyncio as redis

from settings import settings


class PresenseRepository:
    def __init__(self) -> None:
        self.redis_client = redis.Redis(
            host=settings.redis.host,
            port=settings.redis.port,
            db=settings.redis.presense_db
        )

    async def set_online(self, user_id: UUID) -> None:
        await self.redis_client.set(f"{user_id}:online", 1, ex=60)

    async def set_offline(self, user_id) -> None:
        async with self.redis_client.pipeline(transaction=True) as pipe:
            await (
                pipe.delete([f"{user_id}:online"])
                .set(f"{user_id}:last_seen", datetime.now(UTC).isoformat(), ex=300)
                .execute()
            )

    async def is_online(self, user_id: UUID) -> bool:
        online_status = await self.redis_client.exists([f"{user_id}:online"])
        return bool(online_status)

    async def get_last_seen(self, user_id: UUID) -> datetime | None:
        last_seen_raw = await self.redis_client.get(f"{user_id}:last_seen")
        if not last_seen_raw:
            return None
        return datetime.fromisoformat(last_seen_raw.decode("utf-8"))
