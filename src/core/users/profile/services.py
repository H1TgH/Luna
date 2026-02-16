from dataclasses import asdict
from uuid import UUID

from core.users.auth.entities import CurrentUserDTO
from core.users.profile.entities import ProfileCreationDTO, ProfileReadDTO, ProfileUpdateDTO
from core.users.profile.exceptions import ProfileAlreadyExistsException, ProfileDoesNotExistException
from infrastructure.database.repositories.users.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork


class ProfileService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

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
                user_id=profile.user_id,
                username=profile.username,
                first_name=profile.first_name,
                last_name=profile.last_name,
                birth_date=profile.birth_date,
                gender=profile.gender,
                avatar_uploaded=profile.avatar_uploaded,
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
                user_id=profile.user_id,
                username=profile.username,
                first_name=profile.first_name,
                last_name=profile.last_name,
                birth_date=profile.birth_date,
                gender=profile.gender,
                avatar_uploaded=profile.avatar_uploaded,
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


def get_profile_service():
    return ProfileService(UnitOfWork())
