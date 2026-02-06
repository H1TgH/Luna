from dataclasses import asdict
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.entities import UserCreationDTO, UserUpdateDTO
from infrastructure.database.models.users import UserModel


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, user: UserCreationDTO) -> None:
        self.session.add(
            UserModel(
                email=user.email,
                password=user.password,
                first_name=user.first_name,
                last_name=user.last_name,
                birth_date=user.birth_date,
                gender=user.gender,
            )
        )

    async def get_by_id(self, user_id: UUID) -> UserModel:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> UserModel:
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> UserModel:
        stmt = select(UserModel).where(UserModel.username == username)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def update(self, user_id: UUID, user: UserUpdateDTO) -> None:
        updated_data = {field: value for field, value in asdict(user).items() if field is not None}
        stmt = (
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(**updated_data)
        )

        await self.session.execute(stmt)

    async def delete(self, user_id: UUID) -> None:
        stmt = delete(UserModel).where(UserModel.id == user_id)
        await self.session.execute(stmt)


def user_repository_factory(session: AsyncSession) -> UserRepository:
    return UserRepository(session)
