from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.profile.entities import ProfileCreationDTO
from infrastructure.database.models.profile import ProfileModel


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, data: ProfileCreationDTO, user_id: UUID) -> None:
        self.session.add(ProfileModel(
            username=data.username,
            user_id=user_id,
            first_name=data.first_name,
            last_name=data.last_name,
            birth_date=data.birth_date,
            gender=data.gender
        ))

    async def get_by_user_id(self, user_id: UUID) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.user_id == user_id)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.username == username)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()
