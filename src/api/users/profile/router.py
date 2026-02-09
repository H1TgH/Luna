from fastapi import APIRouter, Depends
from starlette import status

from api.users.profile.schemas import ProfileCreationSchema
from core.users.auth.entities import CurrentUserDTO
from core.users.profile.entities import ProfileCreationDTO
from core.users.profile.services import ProfileService, get_profile_service
from dependencies import get_current_user


profile_router = APIRouter(
    prefix="/user",
    tags=["profile"]
)


@profile_router.post(
    "/profile",
    status_code=status.HTTP_201_CREATED
)
async def create_profile(
    data: ProfileCreationSchema,
    user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    dto = ProfileCreationDTO(**data.model_dump())

    await service.create(dto, user)

    return {
        "msg": "Profile created successfully"
    }
