from dataclasses import asdict

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from api.profile.decorators import handle_profile_exceptions
from api.profile.schemas import ProfileCreationSchema, ProfileSchema, ProfileUpdateSchema
from core.auth.entities import CurrentUserDTO
from core.profile.entities import ProfileCreationDTO, ProfileUpdateDTO
from core.profile.services import ProfileService, get_profile_service
from dependencies import get_current_user


profile_router = APIRouter(
    prefix="/user/profile",
    tags=["profile"]
)


@profile_router.post(
    "",
    status_code=status.HTTP_201_CREATED
)
@handle_profile_exceptions
async def create_profile(
    data: ProfileCreationSchema,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    dto = ProfileCreationDTO(**data.model_dump())

    await service.create(dto, current_user)

    return {
        "msg": "Profile created successfully"
    }


@profile_router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=ProfileSchema
)
@handle_profile_exceptions
async def get_my_profile(
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    profile = await service.get_by_user_id(current_user.id)

    return ProfileSchema(**asdict(profile))


@profile_router.get(
    "/search",
    status_code=status.HTTP_200_OK,
    response_model=list[ProfileSchema]
)
async def profiles_search(
    query: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(15, le=30),
    offset: int = Query(0),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    profiles = await service.search(query=query, limit=limit, offset=offset)

    return [ProfileSchema(**asdict(p)) for p in profiles]


@profile_router.patch(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT
)
@handle_profile_exceptions
async def update_profile(
    data: ProfileUpdateSchema,
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    dto = ProfileUpdateDTO(**data.model_dump())

    await service.update(dto, current_user)


@profile_router.post(
    "/me/avatar",
    status_code=status.HTTP_204_NO_CONTENT
)
@handle_profile_exceptions
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: CurrentUserDTO = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service)
):
    await service.upload_avatar(
        data=avatar.file,
        user=current_user
    )


@profile_router.get(
    "/{username}",
    status_code=status.HTTP_200_OK,
    response_model=ProfileSchema
)
@handle_profile_exceptions
async def get_profile(
    username: str,
    service: ProfileService = Depends(get_profile_service),
    current_user: CurrentUserDTO = Depends(get_current_user)
):
    profile = await service.get_by_username(username)

    return ProfileSchema(**asdict(profile))
