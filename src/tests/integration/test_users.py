from http import HTTPStatus

import bcrypt
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.models.users import UserModel


@pytest.mark.asyncio
async def test_user_register(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "test@example.com",
        "password": "123123123"
    }
    response = await client.post("/api/v1/users/auth/register", json=payload)

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == payload["email"])
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()

    assert user is not None
    assert user.email == payload["email"]
    assert user.password != payload["password"]


@pytest.mark.asyncio
async def test_register_user_with_existing_email(client: AsyncClient, db_session: AsyncSession):
    db_session.add(UserModel(
        email="test@example.com",
        password="123123123"
    ))
    await db_session.commit()

    payload = {
        "email": "test@example.com",
        "password": "123123123"
    }
    response = await client.post("/api/v1/users/auth/register", json=payload)

    assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.asyncio
async def test_register_user_with_invalid_email(client: AsyncClient, db_session: AsyncSession):
    payload = {
            "email": "test",
            "password": "123123123"
    }
    response = await client.post("/api/v1/users/auth/register", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_register_user_with_empty_payload(client: AsyncClient, db_session: AsyncSession):
    payload = {}
    response = await client.post("/api/v1/users/auth/register", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient, db_session: AsyncSession):
    db_session.add(UserModel(
        email="test@example.com",
        password=bcrypt.hashpw(b"123123123", bcrypt.gensalt()).decode("utf-8")
    ))
    await db_session.commit()

    payload = {
        "email": "test@example.com",
        "password": "123123123"
    }
    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_login_user_failed(client: AsyncClient, db_session: AsyncSession):
    db_session.add(UserModel(
        email="test@example.com",
        password=bcrypt.hashpw(b"123123123", bcrypt.gensalt()).decode("utf-8")
    ))
    await db_session.commit()

    payload = {
        "email": "test@example.com",
        "password": "1231231231231231123"
    }
    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_login_not_existing_user(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "test@example.com",
        "password": "123123123"
    }
    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_login_user_empty_payload(client: AsyncClient, db_session: AsyncSession):
    payload = {}
    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_login_user_with_invalid_email(client: AsyncClient, db_session: AsyncSession):
    payload = {
        "email": "test",
        "password": ""
    }
    response = await client.post("/api/v1/users/auth/login", json=payload)

    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
