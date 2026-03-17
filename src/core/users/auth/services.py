import asyncio
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
    EmailNotConfirmedException
)
from infrastructure.database.repositories.users.auth import AuthRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings
from core.users.auth.tasks import send_confirmation_email


class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create(self, user: UserCreationDTO) -> None:
        async with self.uow() as session:
            repository = AuthRepository(session)

            existing_user = await repository.get_by_email(user.email)
            if existing_user:
                raise UserAlreadyExistsException("User already exists")

            hashed_password = await asyncio.to_thread(
                bcrypt.hashpw, user.password.encode("utf-8"), bcrypt.gensalt()
            )
            user.password = hashed_password.decode("utf-8")

            user = await repository.add(user)

            confirmation_token = self.create_token(
                data={"sub": str(user.id), "type": "email_confirm"},
                expires_delta=timedelta(minutes=15)
            )
            confirmation_url = f"{settings.app.base_url}/confirm-email?token={confirmation_token}"

            send_confirmation_email.delay(user.email, confirmation_url)

    async def authenticate(self, creds: UserLoginDTO) -> AuthenticatedUserDTO:
        async with self.uow() as session:
            repository = AuthRepository(session)

            user = await repository.get_by_email(creds.email)
            if not user or not await self.verify_password(creds.password, user.password):
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

            if not user.is_email_confirmed:
                raise EmailNotConfirmedException("Email not confirmed")

            dto = CurrentUserDTO(
                id=user.id,
                email=user.email,
            )

        return dto

    async def confirm_email(self, user_id) -> None:
        async with self.uow() as session:
            repository = AuthRepository(session)

            user = await repository.get_by_id(user_id)
            if not user:
                raise UserDoesNotExistException("User does not exist")

            await repository.confirm_email(user_id)

    @staticmethod
    async def verify_password(plain_password: str, hashed_password: str) -> bool:
        return await asyncio.to_thread(
            bcrypt.checkpw,
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )

    @staticmethod
    def create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
        payload = data.copy()
        exp = datetime.now(UTC) + expires_delta
        payload.update({"exp": exp})

        return jwt.encode(
            payload,
            settings.security.secret_key.get_secret_value(),
            settings.security.algorithm.get_secret_value()
        )

    @staticmethod
    def verify_token(token: str, token_type: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.security.secret_key.get_secret_value(),
                algorithms=[settings.security.algorithm.get_secret_value()],
            )
        except ExpiredSignatureError as e:
            raise InvalidTokenException("Token expired") from e
        except JWTError as e:
            raise InvalidTokenException("Invalid token") from e

        if payload.get("type") != token_type:
            raise InvalidTokenException("Invalid token type")

        return payload


def get_auth_service() -> AuthService:
    return AuthService(UnitOfWork())
