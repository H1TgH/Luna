from fastapi import APIRouter, Depends, Query, Request, Response, status

from api.auth.decorators import handle_auth_exceptions
from api.auth.schemas import (
    PasswordResetSchema,
    RequestPasswordResetSchema,
    UserLoginSchema,
    UserRegistrationSchema,
)
from core.auth.entities import UserCreationDTO, UserLoginDTO
from core.auth.services import AuthService, get_auth_service
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
)
@handle_auth_exceptions
async def login_user(
    creds: UserLoginSchema,
    response: Response,
    service: AuthService = Depends(get_auth_service)
):
    dto = UserLoginDTO(**creds.model_dump())

    tokens = await service.login(dto)

    response.set_cookie(
        "user_access_token",
        tokens.access_token,
        max_age=settings.security.access_ttl * 60,
        # secure=True, noqa: ERA001
        httponly=True,
        samesite="lax"
    )
    response.set_cookie(
        "user_refresh_token",
        tokens.refresh_token,
        max_age=settings.security.refresh_ttl * 24 * 60 * 60,
        # secure=True, noqa: ERA001
        httponly=True,
        samesite="lax",
    )

    return {
        "msg": "User authenticated successfully"
    }


@auth_router.post(
    "/refresh",
    status_code=status.HTTP_200_OK
)
@handle_auth_exceptions
async def refresh_user(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service)
):
    token = request.cookies.get("user_refresh_token", None)

    new_token = service.refresh(token)

    response.set_cookie(
        "user_access_token",
        new_token,
        max_age=settings.security.access_ttl * 60,
        # secure=True, noqa: ERA001
        httponly=True,
        samesite="lax"
    )


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


@auth_router.post(
    "/logout",
    status_code=status.HTTP_200_OK
)
async def logout(
    response: Response
):
    response.delete_cookie("user_access_token")
    response.delete_cookie("user_refresh_token")
