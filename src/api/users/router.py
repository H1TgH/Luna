from datetime import timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.users.decorators import handle_user_exceptions
from api.users.schemas import TokenResponseSchema, UserLoginSchema, UserRegistrationSchema
from core.users.entities import UserCreationDTO, UserLoginDTO
from core.users.services import UserService, get_user_service
from infrastructure.database.database import get_db
from settings import settings


user_router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@user_router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    tags=["users"],
)
@handle_user_exceptions
async def register_user(
    user_data: UserRegistrationSchema,
    db_session: AsyncSession = Depends(get_db)
):
    service = UserService(db_session)

    dto = UserCreationDTO(**user_data.model_dump())

    await service.create(dto)

    return {
        "msg": "User created successfully"
    }


@user_router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=TokenResponseSchema,
    tags=["users"],
)
@handle_user_exceptions
async def login_user(
    creds: UserLoginSchema,
    db_session: AsyncSession = Depends(get_db)
):
    service = UserService(db_session)

    dto = UserLoginDTO(**creds.model_dump())

    user = await service.authenticate(dto)

    access_token = service.create_token(
        {"sub": str(user.id), "type": "access"},
        expires_delta=timedelta(minutes=settings.security.access_ttl),
    )
    refresh_token = service.create_token(
        {"sub": str(user.id), "type": "refresh"},
        expires_delta=timedelta(minutes=settings.security.refresh_ttl),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
