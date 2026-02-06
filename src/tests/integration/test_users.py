from http import HTTPStatus

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.database.models.users import UserModel


@pytest.mark.asyncio
async def test_user_register(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None

@pytest.mark.asyncio
async def test_user_register1(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None

@pytest.mark.asyncio
async def test_user_register2(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None


@pytest.mark.asyncio
async def test_user_register3(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None

@pytest.mark.asyncio
async def test_user_register4(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None

@pytest.mark.asyncio
async def test_user_register5(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/users/register", json={
        "email": "ivan@example.com",
        "password": "123123123",
        "first_name": "ivan",
        "last_name": "fedorov",
        "birth_date": "2005-11-10",
        "gender": "Male"
    })

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["msg"] == "User created successfully"

    stmt = select(UserModel).where(UserModel.email == "ivan@example.com")
    result = await db_session.execute(stmt)
    user = result.scalars().first()

    assert user is not None
