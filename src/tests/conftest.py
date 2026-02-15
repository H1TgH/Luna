from contextlib import asynccontextmanager

import bcrypt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.users.auth.services import AuthService, get_auth_service
from infrastructure.database.models.users import UserModel
from main import app


class TestUnitOfWork:
    def __init__(self, session: AsyncSession):
        self._session = session

    @asynccontextmanager
    async def __call__(self):
        yield self._session
        await self._session.commit()


@pytest.fixture
async def db_session():
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from infrastructure.database.database import Base
    from settings import settings

    engine = create_async_engine(settings.db.database_url)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, autoflush=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.connect() as conn:
        async with Session(bind=conn) as session:
            yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def test_user_service(db_session: AsyncSession):
    uow = TestUnitOfWork(db_session)
    return AuthService(uow)


@pytest.fixture
async def client(test_user_service):
    app.dependency_overrides[get_auth_service] = lambda: test_user_service
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def user_auth_payload():
    def payload(**overrides):
        data = {
            "email": "test@example.com",
            "password": "123123123",
        }
        data.update(overrides)
        return data

    return payload


@pytest.fixture
async def test_user(db_session: AsyncSession):
    db_session.add(UserModel(
        email="test@example.com",
        password=bcrypt.hashpw(b"123123123", bcrypt.gensalt()).decode(),)
    )

    await db_session.commit()
