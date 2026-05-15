import asyncio
from typing import BinaryIO
from uuid import UUID

from core.auth.entities import CurrentUserDTO
from core.profile.entities import ProfileCreationDTO, ProfileReadDTO, ProfileUpdateDTO
from core.profile.exceptions import ProfileAlreadyExistsException, ProfileDoesNotExistException
from infrastructure.database.models.profile import ProfileModel
from infrastructure.database.repositories.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.s3.storage import S3Storage
from settings import settings


class ProfileService:
    def __init__(
        self,
        uow: UnitOfWork,
        s3_storage: S3Storage,
        image_processor: ImageProcessor
    ) -> None:
        self.uow = uow
        self.s3 = s3_storage
        self.image_processor = image_processor

    async def create(self, data: ProfileCreationDTO, user: CurrentUserDTO) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)
            await self._validate_profile_uniqueness(repository, data, user.id)
            await repository.add(data, user.id)

    async def get_by_user_id(self, user_id: UUID) -> ProfileReadDTO:
        async with self.uow() as session:
            repository = ProfileRepository(session)
            profile = await self._get_profile_by_id_or_raise(repository, user_id)
            avatar_url = self._build_avatar_url(profile.avatar_key)
            dto = ProfileReadDTO.from_model(profile, avatar_url)

        return dto

    async def get_by_username(self, username: str) -> ProfileReadDTO:
        async with self.uow() as session:
            repository = ProfileRepository(session)
            profile = await self._get_profile_by_username_or_raise(repository, username)
            avatar_url = self._build_avatar_url(profile.avatar_key)
            dto = ProfileReadDTO.from_model(profile, avatar_url)

        return dto

    async def update(self, data: ProfileUpdateDTO, user: CurrentUserDTO) -> None:
        update_data = self._validate_update_data(data)
        async with self.uow() as session:
            repository = ProfileRepository(session)
            await self._get_profile_by_id_or_raise(repository, user.id)
            await repository.update(update_data, user.id)

    async def upload_avatar(
        self,
        data: BinaryIO,
        user: CurrentUserDTO
    ) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            await self._get_profile_by_id_or_raise(repository, user.id)

            converted = await asyncio.to_thread(self.image_processor.convert_to_webp, data)
            object_key = f"{user.id}.webp"

            await self.s3.upload(object_key, converted, "image/webp")

            await repository.update({"avatar_key": object_key}, user.id)

    async def search(
        self,
        query: str,
        offset: int = 0,
        limit: int = 15
    ) -> list[ProfileReadDTO]:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            profiles = await repository.search(query=query, limit=limit, offset=offset)

            if not profiles:
                return []

            return [
                ProfileReadDTO.from_model(profile, self._build_avatar_url(profile.avatar_key))
                for profile in profiles
            ]

    def _build_avatar_url(self, avatar_key: str | None) -> str | None:
        if not avatar_key:
            return None
        return self.s3.get_file_url(avatar_key)

    async def _validate_profile_uniqueness(
        self,
        repository: ProfileRepository,
        data: ProfileCreationDTO,
        user_id: UUID
    ) -> None:
        if await self._is_profile_id_exists(repository, user_id):
            raise ProfileAlreadyExistsException("Profile already exists")
        if await self._is_username_exist(repository, data.username):
            raise ProfileAlreadyExistsException("Username already taken")

    async def _is_profile_id_exists(self, repository: ProfileRepository, user_id: UUID) -> bool:
        return await repository.get_by_user_id(user_id) is not None

    async def _is_username_exist(self, repository: ProfileRepository, username: str) -> bool:
        return await repository.get_by_username(username) is not None

    async def _get_profile_by_id_or_raise(self, repository: ProfileRepository, user_id: UUID) -> ProfileModel:
        profile = await repository.get_by_user_id(user_id)
        if not profile:
            raise ProfileDoesNotExistException("Profile does not exist")

        return profile

    async def _get_profile_by_username_or_raise(self, repository: ProfileRepository, username: str) -> ProfileModel:
        profile = await repository.get_by_username(username)
        if not profile:
            raise ProfileDoesNotExistException("Profile does not exist")

        return profile

    def _validate_update_data(self, data: ProfileUpdateDTO) -> dict:
        update_data = data.to_update_dict()
        if not update_data:
            raise ValueError("No fields provided for update")

        return update_data


def get_profile_service() -> ProfileService:
    return ProfileService(
        uow=UnitOfWork(),
        s3_storage=S3Storage(
            access_key=settings.s3.access_key,
            secret_key=settings.s3.secret_key.get_secret_value(),
            bucket_name="avatars",
            internal_endpoint_url=settings.s3.internal_endpoint,
            public_endpoint_url=settings.s3.public_endpoint
        ),
        image_processor=ImageProcessor()
    )
