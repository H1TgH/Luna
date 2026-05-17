from datetime import UTC, datetime
from uuid import UUID

from core.presense.entities import PresenseReadDTO
from infrastructure.database.repositories.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from infrastructure.presense.repository import PresenseRepository


class PresenseService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.presense_repository = PresenseRepository()
        self.uow = uow

    async def set_online(self, user_id: UUID) -> None:
        await self.presense_repository.set_online(user_id)
        await self._update_last_seen(user_id)

    async def set_offline(self, user_id: UUID) -> None:
        await self.presense_repository.set_offline(user_id)
        await self._update_last_seen(user_id)

    async def get_presense(self, user_id: UUID) -> PresenseReadDTO:
        is_online = await self.presense_repository.is_online(user_id)
        last_seen = await self.presense_repository.get_last_seen(user_id)

        dto = PresenseReadDTO(
            user_id=user_id,
            is_online=is_online,
            last_seen=last_seen
        )

        return dto

    async def _update_last_seen(self, user_id: UUID) -> None:
        current_time = datetime.now(UTC)

        async with self.uow() as session:
            repository = ProfileRepository(session)
            await repository.update_last_seen(user_id, current_time)


def get_presense_service() -> PresenseService:
    return PresenseService(UnitOfWork())
