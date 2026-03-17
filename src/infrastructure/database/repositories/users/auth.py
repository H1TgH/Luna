from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.auth.entities import UserCreationDTO
from infrastructure.database.models.users import UserModel


class AuthRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add(self, user: UserCreationDTO):
        db_user = UserModel(
            email=user.email,
            password=user.password
        )

        self.session.add(db_user)
        await self.session.flush()

        return db_user

    async def get_by_email(self, email: str) -> UserModel:
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> UserModel:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self.session.execute(stmt)

        return result.scalar_one_or_none()

    async def confirm_email(self, user_id) -> None:
        stmt = update(UserModel).where(UserModel.id == user_id).values(is_email_confirmed=True)
        await self.session.execute(stmt)
