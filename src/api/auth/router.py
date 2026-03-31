from fastapi import APIRouter, Depends, Query, status

from api.auth.decorators import handle_auth_exceptions
from api.auth.schemas import (
    PasswordResetSchema,
    RequestPasswordResetSchema,
    TokenSchema,
    TokensSchema,
    UserLoginSchema,
    UserRegistrationSchema,
)
from core.auth.entities import UserCreationDTO, UserLoginDTO
from core.auth.services import AuthService, get_auth_service


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
    "/confirm-email",
    status_code=status.HTTP_200_OK
)
@handle_auth_exceptions
async def confirm_email(
    token: str = Query(...),
    service: AuthService = Depends(get_auth_service)
):
    user_id = service.get_user_id_from_token_or_raise(token, "email_confirm")

    await service.confirm_email(user_id)


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

    tokens = await service.login(dto)

    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
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
    new_token = service.refresh(token.token)
    return {"token": new_token}


@auth_router.post(
    "/reset-password/request",
    status_code=status.HTTP_204_NO_CONTENT
)
@handle_auth_exceptions
async def request_password_reset(
    email: RequestPasswordResetSchema,
    service: AuthService = Depends(get_auth_service)
):
    await service.request_password_reset(email.email)


@auth_router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK
)
@handle_auth_exceptions
async def reset_password(
    new_password: PasswordResetSchema,
    token: str = Query(...),
    service: AuthService = Depends(get_auth_service)
):
    user_id = service.get_user_id_from_token_or_raise(token, "password_reset")

    await service.change_password(user_id, new_password.new_password)
