from core.users.auth.entities import CurrentUserDTO
from core.users.profile.entities import ProfileCreationDTO
from core.users.profile.exceptions import ProfileAlreadyExistsException
from infrastructure.database.repositories.users.profile import ProfileRepository
from infrastructure.database.uow import UnitOfWork


class ProfileService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create(self, data: ProfileCreationDTO, user: CurrentUserDTO) -> None:
        async with self.uow() as session:
            repository = ProfileRepository(session)

            existing_profile = await repository.get_by_user_id(user.id)
            if existing_profile:
                raise ProfileAlreadyExistsException("Profile already exists")

            await repository.add(data, user.id)


def get_profile_service():
    return ProfileService(UnitOfWork())
