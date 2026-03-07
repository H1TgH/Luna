from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.profile.entities import ProfileCreationDTO
from infrastructure.database.models.profile import ProfileModel


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, profile: ProfileCreationDTO, user_id: UUID) -> None:
        self.session.add(ProfileModel(
            username=profile.username,
            user_id=user_id,
            first_name=profile.first_name,
            last_name=profile.last_name,
            birth_date=profile.birth_date,
            gender=profile.gender
        ))

    async def update(self, data: dict[str, Any], user_id: UUID) -> None:
        await self.session.execute(
            update(ProfileModel)
            .where(ProfileModel.user_id == user_id)
            .values(data)
        )

    async def get_by_user_id(self, user_id: UUID) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.user_id == user_id)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.username == username)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()
