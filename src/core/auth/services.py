import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt

from core.auth.entities import AuthenticatedUserDTO, CurrentUserDTO, LoginTokensDTO, UserCreationDTO, UserLoginDTO
from core.auth.exceptions import (
    EmailNotConfirmedException,
    InvalidCredentialsException,
    InvalidTokenException,
    UserAlreadyExistsException,
    UserDoesNotExistException,
)
from core.auth.tasks import send_confirmation_email, send_reset_password_email
from infrastructure.database.models.users import UserModel
from infrastructure.database.repositories.auth import AuthRepository
from infrastructure.database.uow import UnitOfWork
from settings import settings


class AuthService:
    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    async def create(self, user: UserCreationDTO) -> None:
        async with self.uow() as session:
            repo = AuthRepository(session)

            await self._validate_uniqueness_user_email(repo, user.email)
            user.password = await self.hash_password(user.password)
            user = await repo.add(user)

            confirmation_token = self.create_token(
                {"sub": str(user.id), "type": "email_confirm"},
                timedelta(minutes=15)
            )
            url = self._get_email_confirmation_url(confirmation_token)

            send_confirmation_email.delay(user.email, url)

    async def login(self, creds: UserLoginDTO) -> LoginTokensDTO:
        user = await self._authenticate(creds)

        access_token = self.create_token(
            {"sub": str(user.id), "type": "access"},
            timedelta(minutes=settings.security.access_ttl),
        )
        refresh_token = self.create_token(
            {"sub": str(user.id), "type": "refresh"},
            timedelta(days=settings.security.refresh_ttl),
        )

        return LoginTokensDTO(access_token=access_token, refresh_token=refresh_token)

    def refresh(self, refresh_token: str) -> str:
        user_id = self.get_user_id_from_token_or_raise(refresh_token, "refresh")
        return self.create_token(
            {"sub": user_id, "type": "access"},
            timedelta(minutes=settings.security.access_ttl)
        )

    async def get_current_user(self, token: str) -> CurrentUserDTO:
        async with self.uow() as session:
            repo = AuthRepository(session)
            user_id = self.get_user_id_from_token_or_raise(token, "access")
            user = await self._get_user_by_id_or_raise(repo, user_id)

            if not user.is_email_confirmed:
                raise EmailNotConfirmedException("Email not confirmed")

            dto = CurrentUserDTO(
                id=user.id,
                email=user.email,
            )

        return dto

    async def confirm_email(self, user_id: UUID) -> None:
        async with self.uow() as session:
            repo = AuthRepository(session)
            await self._get_user_by_id_or_raise(repo, user_id)
            await repo.confirm_email(user_id)

    async def request_password_reset(self, email: str) -> None:
        async with self.uow() as session:
            repo = AuthRepository(session)
            user = await self._get_user_by_email_or_raise(repo, email)

            reset_token = self.create_token(
                {"sub": str(user.id), "type": "password_reset"},
                timedelta(minutes=15)
            )
            reset_url = self._get_password_reset_url(reset_token)

            send_reset_password_email.delay(email, reset_url)

    async def change_password(self, user_id: UUID, new_password: str) -> None:
        async with self.uow() as session:
            repo = AuthRepository(session)
            await self._get_user_by_id_or_raise(repo, user_id)
            hashed_password = await self.hash_password(new_password)
            await repo.reset_password(user_id, hashed_password)

    @staticmethod
    async def hash_password(password: str) -> str:
        hashed = await asyncio.to_thread(
            bcrypt.hashpw,
            password.encode("utf-8"),
            bcrypt.gensalt()
        )
        return hashed.decode("utf-8")

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

    def get_user_id_from_token_or_raise(self, token: str, token_type: str) -> UUID:
        payload = self.verify_token(token, token_type)
        return payload.get("sub")

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

    async def _is_email_exists(self, repository: AuthRepository, email: str) -> bool:
        return await repository.get_by_email(email) is not None

    async def _validate_uniqueness_user_email(self, repository: AuthRepository, email: str) -> None:
        if await self._is_email_exists(repository, email):
            raise UserAlreadyExistsException("User already exists")

    async def _validate_credentials(self, user: UserModel | None, password: str) -> None:
        if not user or not await self.verify_password(password, user.password):
            raise InvalidCredentialsException("Incorrect email or password")

    async def _get_user_by_id_or_raise(self, repository: AuthRepository, user_id: UUID) -> UserModel:
        user = await repository.get_by_id(user_id)
        if not user:
            raise UserDoesNotExistException("User does not exist")
        return user

    async def _get_user_by_email_or_raise(self, repository: AuthRepository, email: str) -> UserModel:
        user = await repository.get_by_email(email)
        if not user:
            raise UserDoesNotExistException("User does not exist")
        return user

    def _get_email_confirmation_url(self, confirmation_token: str) -> str:
        return f"{settings.app.base_url}/confirm-email?token={confirmation_token}"

    def _get_password_reset_url(self, reset_token: str) -> str:
        return f"{settings.app.base_url}/reset-password?token={reset_token}"

    async def _authenticate(self, creds: UserLoginDTO) -> AuthenticatedUserDTO:
        async with self.uow() as session:
            repo = AuthRepository(session)
            user = await repo.get_by_email(creds.email)
            await self._validate_credentials(user, creds.password)

            dto = AuthenticatedUserDTO(id=user.id)

        return dto


def get_auth_service() -> AuthService:
    return AuthService(UnitOfWork())
