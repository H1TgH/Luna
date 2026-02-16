from http import HTTPStatus

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.models.users import UserModel


@pytest.mark.asyncio
async def test_user_register(client: AsyncClient, db_session: AsyncSession, user_auth_payload):
    payload = user_auth_payload()

    response = await client.post("/api/v1/users/auth/register", json=payload)

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
