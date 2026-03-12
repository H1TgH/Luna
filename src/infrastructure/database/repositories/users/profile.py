from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.profile.entities import ProfileCreationDTO
from infrastructure.database.models.profile import ProfileModel


class ProfileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, profile: ProfileCreationDTO, user_id: UUID) -> None:
        self.session.add(ProfileModel(
            id=user_id,
            username=profile.username,
            first_name=profile.first_name,
            last_name=profile.last_name,
            birth_date=profile.birth_date,
            gender=profile.gender
        ))

    async def update(self, data: dict[str, Any], user_id: UUID) -> None:
        await self.session.execute(
            update(ProfileModel)
            .where(ProfileModel.id == user_id)
            .values(data)
        )

    async def get_by_user_id(self, user_id: UUID) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.id == user_id)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> ProfileModel:
        stmt = select(ProfileModel).where(ProfileModel.username == username)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def search(
        self,
        query: str,
        limit: int = 15,
        offset: int = 0,
        threshold: float = 0.25
    ) -> list[ProfileModel]:
        query_lower = query.lower()

        stmt = (
            select(ProfileModel)
            .where(
                or_(
                    func.similarity(ProfileModel.username, query) > threshold,
                    func.similarity(ProfileModel.first_name, query) > threshold,
                    func.similarity(ProfileModel.last_name, query) > threshold,
                    ProfileModel.username.ilike(f"%{query}%"),
                    ProfileModel.first_name.ilike(f"%{query}%"),
                    ProfileModel.last_name.ilike(f"%{query}%"),
                )
            )
            .order_by(
                func.greatest(
                    func.similarity(func.lower(ProfileModel.username), query_lower),
                    func.similarity(func.lower(ProfileModel.first_name), query_lower),
                    func.similarity(func.lower(ProfileModel.last_name), query_lower),
                ).desc()
            )
            .limit(limit)
            .offset(offset)
        )
        results = await self.session.execute(stmt)

        return results.scalars().all()
