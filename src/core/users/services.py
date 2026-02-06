from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.entities import UserCreationDTO, UserLoginDTO, UserUpdateDTO
from core.users.exceptions import (
    InvalidCredentialsException,
    InvalidTokenException,
    UserAlreadyExistsException,
    UserDoesNotExistException,
)
from infrastructure.database.models.users import UserModel
from infrastructure.database.repositories.users import UserRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings


class UserService:
    def __init__(self, uow: UnitOfWork, session: AsyncSession = None):
        self.uow = uow
        self.session = session

    async def create(self, user: UserCreationDTO):
        async with self.uow(self.session) as session:
            repository = UserRepository(session)

            existing_user = await repository.get_by_email(user.email)
            if existing_user:
                raise UserAlreadyExistsException("User already exists")

            hashed_password = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            user.password = hashed_password

            await repository.add(user)

    async def delete(self, user_id: UUID):
        async with self.uow(self.session) as session:
            repository = UserRepository(session)

            existing_user = await repository.get_by_id(user_id)
            if not existing_user:
                raise UserDoesNotExistException("User does not exist")

            await repository.delete(user_id)

    async def update(self, user_id: UUID, user: UserUpdateDTO):
        async with self.uow(self.session) as session:
            repository = UserRepository(session)

            existing_user = await repository.get_by_id(user_id)
            if not existing_user:
                raise UserDoesNotExistException("User does not exist")

            await repository.update(user_id, user)

    async def authenticate(self, creds: UserLoginDTO):
        async with self.uow(self.session) as session:
            repository = UserRepository(session)
            user = await repository.get_by_email(creds.email)
            if not user or not self.verify_password(creds.password, user.password):
                raise InvalidCredentialsException("Incorrect email or password")

        return user

    async def get_current_user(self, token: str) -> UserModel:
        async with self.uow(self.session) as session:
            repository = UserRepository(session)

            payload = self.verify_token(token, "access")
            user_id = payload.get("user_id")

            user = await repository.get_by_id(user_id)
            if not user:
                raise UserDoesNotExistException("User does not exist")

            return user

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str):
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    @staticmethod
    def create_token(data: dict[str, Any], expires_delta: timedelta):
        payload = data.copy()
        exp = datetime.now(UTC) + expires_delta
        payload.update({"exp": exp})

        return jwt.encode(
            payload,
            settings.security.secret_key.get_secret_value(),
            settings.security.algorithm.get_secret_value()
        )

    @staticmethod
    def verify_token(token: str, token_type: str):
        try:
            payload = jwt.decode(
                token,
                settings.security.secret_key.get_secret_value(),
                algorithms=[settings.security.algorithm.get_secret_value()],
            )
        except ExpiredSignatureError:
            raise InvalidTokenException("Token expired") from None
        except JWTError:
            raise InvalidTokenException("Invalid token") from None

        if payload.get("type") != token_type:
            raise InvalidTokenException("Invalid token type")

        return payload


def get_user_service(session: AsyncSession = None):
    return UserService(UnitOfWork(), session)
