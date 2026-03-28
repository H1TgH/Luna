from datetime import timedelta
from http import HTTPStatus
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.models.users import UserModel


@pytest.mark.asyncio
async def test_user_register(client: AsyncClient, db_session: AsyncSession, user_auth_payload):
    payload = user_auth_payload()

    with patch("core.users.auth.services.send_confirmation_email.delay") as mock_send:
        response = await client.post("/api/v1/users/auth/register", json=payload)
        mock_send.assert_called_once()

    assert response.status_code == HTTPStatus.CREATED

    stmt = select(UserModel).where(UserModel.email == payload["email"])
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()

    assert user is not None
    assert user.email == payload["email"]
    assert user.password != payload["password"]


@pytest.mark.asyncio
async def test_register_user_with_existing_email(client: AsyncClient, test_user, user_auth_payload):
    response = await client.post("/api/v1/users/auth/register", json=user_auth_payload())

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_register_user_with_invalid_email(client: AsyncClient, user_auth_payload):
    response = await client.post("/api/v1/users/auth/register", json=user_auth_payload(email="test"))

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.parametrize("field", [
    "email",
    "password"
])
@pytest.mark.asyncio
async def test_register_user_missing_required_field(client: AsyncClient, user_auth_payload, field):
    payload = user_auth_payload()
    payload.pop(field)

    response = await client.post("/api/v1/users/auth/register", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient, test_user, user_auth_payload):
    response = await client.post("/api/v1/users/auth/login", json=user_auth_payload())

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_login_user_failed(client: AsyncClient, test_user, user_auth_payload):
    response = await client.post("/api/v1/users/auth/login", json=user_auth_payload(password="321321321"))

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_login_not_existing_user(client: AsyncClient, user_auth_payload):
    response = await client.post("/api/v1/users/auth/login", json=user_auth_payload())

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.parametrize("field", [
    "email",
    "password"
])
@pytest.mark.asyncio
async def test_login_user_missing_required_field(client: AsyncClient, user_auth_payload, field):
    payload = user_auth_payload()
    payload.pop(field)

    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_login_user_with_invalid_email(client: AsyncClient, user_auth_payload):
    response = await client.post("/api/v1/users/auth/login", json=user_auth_payload(email="test"))

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_confirm_email(
    client: AsyncClient,
    test_auth_service,
    user_factory,
):
    user = await user_factory(is_email_confirmed=False)

    token = test_auth_service.create_token(
        {"sub": str(user.id), "type": "email_confirm"},
        expires_delta=timedelta(minutes=15),
    )

    response = await client.post(f"/api/v1/users/auth/confirm-email?token={token}")

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_confirm_email_invalid_token(client: AsyncClient):
    response = await client.post("/api/v1/users/auth/confirm-email?token=token123")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_confirm_email_wrong_token_type(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "access"},
        expires_delta=timedelta(minutes=15),
    )

    response = await client.post(f"/api/v1/users/auth/confirm-email?token={token}")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_confirm_email_expired_token(
    client: AsyncClient,
    test_auth_service,
    user_factory,
):
    user: UserModel = await user_factory(is_email_confirmed=False)

    token = test_auth_service.create_token(
        {"sub": str(user.id), "type": "email_confirm"},
        expires_delta=timedelta(seconds=-1),
    )

    response = await client.post(f"/api/v1/users/auth/confirm-email?token={token}")

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_refresh_token(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    refresh_token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "refresh"},
        expires_delta=timedelta(days=7),
    )

    response = await client.post("/api/v1/users/auth/refresh", json={"token": refresh_token})

    assert response.status_code == HTTPStatus.OK
    assert "token" in response.json()


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    response = await client.post("/api/v1/users/auth/refresh", json={"token": "invalid_token"})

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_refresh_token_wrong_type(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "access"},
        expires_delta=timedelta(minutes=30),
    )

    response = await client.post("/api/v1/users/auth/refresh", json={"token": token})

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_refresh_token_expired(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "refresh"},
        expires_delta=timedelta(seconds=-1),
    )

    response = await client.post("/api/v1/users/auth/refresh", json={"token": token})

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_refresh_token_missing_field(client: AsyncClient):
    response = await client.post("/api/v1/users/auth/refresh", json={})

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_request_password_reset(
    client: AsyncClient,
    test_user: UserModel,
):
    with patch("core.users.auth.services.send_reset_password_email.delay") as mock_send:
        response = await client.post(
            "/api/v1/users/auth/reset-password/request",
            json={"email": test_user.email},
        )
        mock_send.assert_called_once()

    assert response.status_code == HTTPStatus.NO_CONTENT


@pytest.mark.asyncio
async def test_request_password_reset_nonexistent_user(client: AsyncClient):
    with patch("core.users.auth.services.send_reset_password_email.delay"):
        response = await client.post(
            "/api/v1/users/auth/reset-password/request",
            json={"email": "test@example.com"},
        )

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.asyncio
async def test_request_password_reset_missing_email(client: AsyncClient):
    response = await client.post(
        "/api/v1/users/auth/reset-password/request",
        json={},
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_reset_password(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
    user_auth_payload,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "password_reset"},
        expires_delta=timedelta(minutes=15),
    )

    response = await client.post(
        f"/api/v1/users/auth/reset-password?token={token}",
        json={"new_password": "new_password"},
    )

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    response = await client.post(
        "/api/v1/users/auth/reset-password?token=token123",
        json={"new_password": "new_password"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_reset_password_wrong_token_type(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "access"},
        expires_delta=timedelta(minutes=15),
    )

    response = await client.post(
        f"/api/v1/users/auth/reset-password?token={token}",
        json={"new_password": "new_password"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_reset_password_expired_token(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "password_reset"},
        expires_delta=timedelta(seconds=-1),
    )

    response = await client.post(
        f"/api/v1/users/auth/reset-password?token={token}",
        json={"new_password": "new_password"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_reset_password_missing_body(
    client: AsyncClient,
    test_auth_service,
    test_user: UserModel,
):
    token = test_auth_service.create_token(
        {"sub": str(test_user.id), "type": "password_reset"},
        expires_delta=timedelta(minutes=15),
    )

    response = await client.post(
        f"/api/v1/users/auth/reset-password?token={token}",
        json={},
    )

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
