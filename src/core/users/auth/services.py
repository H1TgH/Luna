from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt

from core.users.auth.entities import AuthenticatedUserDTO, CurrentUserDTO, UserCreationDTO, UserLoginDTO
from core.users.auth.exceptions import (
    InvalidCredentialsException,
    InvalidTokenException,
    UserAlreadyExistsException,
    UserDoesNotExistException,
)
from infrastructure.database.repositories.users.auth import AuthRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings


class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create(self, user: UserCreationDTO):
        async with self.uow() as session:
            repository = AuthRepository(session)

            existing_user = await repository.get_by_email(user.email)
            if existing_user:
                raise UserAlreadyExistsException("User already exists")

            hashed_password = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            user.password = hashed_password

            await repository.add(user)

    async def authenticate(self, creds: UserLoginDTO) -> AuthenticatedUserDTO:
        async with self.uow() as session:
            repository = AuthRepository(session)
            user = await repository.get_by_email(creds.email)
            if not user or not self.verify_password(creds.password, user.password):
                raise InvalidCredentialsException("Incorrect email or password")

            dto = AuthenticatedUserDTO(id=user.id)

        return dto

    async def get_current_user(self, token: str) -> CurrentUserDTO:
        async with self.uow() as session:
            repository = AuthRepository(session)

            payload = self.verify_token(token, "access")
            user_id = payload.get("sub")

            user = await repository.get_by_id(user_id)
            if not user:
                raise UserDoesNotExistException("User does not exist")

            dto = CurrentUserDTO(
                id=user.id,
                email=user.email,
            )

        return dto

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


def get_auth_service():
    return AuthService(UnitOfWork())
