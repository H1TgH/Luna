from datetime import timedelta

from fastapi import APIRouter, Depends, status

from api.users.auth.decorators import handle_auth_exceptions
from api.users.auth.schemas import TokenSchema, TokensSchema, UserLoginSchema, UserRegistrationSchema
from core.users.auth.entities import UserCreationDTO, UserLoginDTO
from core.users.auth.services import AuthService, get_auth_service
from settings import settings


auth_router = APIRouter(
    prefix="/users/auth",
    tags=["auth"],
)


@auth_router.post(
    "/register",
    status_code=status.HTTP_201_CREATED
)
@handle_auth_exceptions
async def register_user(
    data: UserRegistrationSchema,
    service: AuthService = Depends(get_auth_service)
):
    dto = UserCreationDTO(**data.model_dump())

    await service.create(dto)

    return {
        "msg": "User created successfully"
    }


@auth_router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=TokensSchema,
)
@handle_auth_exceptions
async def login_user(
    creds: UserLoginSchema,
    service: AuthService = Depends(get_auth_service)
):
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


@auth_router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    response_model=TokenSchema
)
@handle_auth_exceptions
async def refresh_user(
    token: TokenSchema,
    service: AuthService = Depends(get_auth_service)
):
    user = service.verify_token(token.token, "refresh")

    access_token = service.create_token(
        data={"sub": user["sub"], "type": "access"},
        expires_delta=timedelta(minutes=settings.security.access_ttl)
    )

    return {
        "token": access_token
    }
