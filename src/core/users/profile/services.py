import asyncio
from dataclasses import asdict
from typing import BinaryIO
from uuid import UUID

from core.users.auth.entities import CurrentUserDTO
from core.users.profile.entities import ProfileCreationDTO, ProfileReadDTO, ProfileUpdateDTO
from core.users.profile.exceptions import ProfileAlreadyExistsException, ProfileDoesNotExistException
from infrastructure.database.repositories.users.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork
from infrastructure.media.images.processor import ImageProcessor
from infrastructure.s3.storage import S3Storage
from settings import settings


class ProfileService:
    def __init__(self, uow: UnitOfWork, s3_storage: S3Storage, image_processor: ImageProcessor):
        self.uow = uow
        self.s3 = s3_storage
        self.image_processor = image_processor

    async def create(self, data: ProfileCreationDTO, user: CurrentUserDTO) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            existing_user_id = await repository.get_by_user_id(user.id)
            if existing_user_id:
                raise ProfileAlreadyExistsException("Profile already exists")

            existing_username = await repository.get_by_username(data.username)
            if existing_username:
                raise ProfileAlreadyExistsException("Profile already exists")

            await repository.add(data, user.id)

    async def get_by_user_id(self, user_id: UUID) -> ProfileReadDTO:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            profile = await repository.get_by_user_id(user_id)
            if not profile:
                raise ProfileDoesNotExistException("Profile does not exist")

            dto = ProfileReadDTO(
                id=profile.id,
                username=profile.username,
                first_name=profile.first_name,
                last_name=profile.last_name,
                birth_date=profile.birth_date,
                gender=profile.gender,
                avatar_url=profile.avatar_url,
                status=profile.status
            )

        return dto

    async def get_by_username(self, username: str) -> ProfileReadDTO:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            profile = await repository.get_by_username(username)
            if profile is None:
                raise ProfileDoesNotExistException("Profile does not exist")

            dto = ProfileReadDTO(
                id=profile.id,
                username=profile.username,
                first_name=profile.first_name,
                last_name=profile.last_name,
                birth_date=profile.birth_date,
                gender=profile.gender,
                avatar_url=profile.avatar_url,
                status=profile.status
            )

        return dto

    async def update(self, data: ProfileUpdateDTO, user: CurrentUserDTO) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            existing_profile = await repository.get_by_user_id(user.id)
            if existing_profile is None:
                raise ProfileDoesNotExistException("Profile does not exist")

            update_data = {
                k: v
                for k, v in asdict(data).items()
                if v is not None
            }
            if not update_data:
                raise ValueError("No fields provided for update")

            await repository.update(update_data, user.id)

    async def upload_avatar(
        self,
        file_name: str,
        data: BinaryIO,
        content_type: str,
        user: CurrentUserDTO
    ) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            profile = await repository.get_by_user_id(user.id)
            if profile is None:
                raise ProfileDoesNotExistException("Profile does not exist")

            converted = await asyncio.to_thread(self.image_processor.convert_to_webp, data)
            object_key = f"{user.id}.webp"

            await self.s3.upload(object_key, converted, "image/webp")

            avatar_url = f"{self.s3.public_endpoint}/{self.s3.bucket_name}/{object_key}"
            await repository.update({"avatar_url": avatar_url}, user.id)

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
                ProfileReadDTO(
                    id=p.id,
                    username=p.username,
                    first_name=p.first_name,
                    last_name=p.last_name,
                    birth_date=p.birth_date,
                    gender=p.gender,
                    avatar_url=p.avatar_url,
                    status=p.status
                )
                for p in profiles
            ]


def get_profile_service():
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
